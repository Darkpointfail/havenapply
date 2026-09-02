import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  forceQuarantineForTests,
  issueDocumentAccessUrl,
  softDeleteDocument,
  uploadApplicationDocument,
  DocumentError,
} from "@/lib/documents";
import { AuthzError } from "@/lib/authz";
import { envSchema, resetEnvCache } from "@/lib/env";
import { resetStorageClient } from "@/lib/storage";
import { sampleJpeg, samplePdf } from "../helpers/sample-files";

const prisma = new PrismaClient();

describe("private documents integration", () => {
  let familyAId: string;
  let familyBId: string;
  let staffSite1Id: string;
  let staffOtherId: string;
  let appA1Id: string;

  beforeAll(async () => {
    process.env.DOCUMENT_MAX_BYTES = "1024";
    process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS = "60";
    resetEnvCache();
    resetStorageClient();
    envSchema.parse({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-at-least-16-chars",
      DATABASE_URL: process.env.DATABASE_URL,
      STORAGE_DRIVER: "minio",
      STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || "http://localhost:9000",
      STORAGE_BUCKET: "haven-private",
      STORAGE_ACCESS_KEY_ID: "minioadmin",
      STORAGE_SECRET_ACCESS_KEY: "minioadmin",
      STORAGE_FORCE_PATH_STYLE: "true",
      DOCUMENT_MAX_BYTES: "1024",
      DOCUMENT_SIGNED_URL_TTL_SECONDS: "60",
      EMAIL_DRIVER: "smtp",
      EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
    });
    // Force getEnv() to re-read process.env with the test max size.
    resetEnvCache();

    familyAId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.a@havenapply.local" } })
    ).id;
    familyBId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.b@havenapply.local" } })
    ).id;
    staffSite1Id = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.site1@havenapply.local" } })
    ).id;
    staffOtherId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.other@havenapply.local" } })
    ).id;
    appA1Id = (
      await prisma.application.findUniqueOrThrow({ where: { publicRef: "HA-SEED-A1" } })
    ).id;
  });

  it("rejects invalid type and oversized files", async () => {
    await expect(
      uploadApplicationDocument({
        userId: familyAId,
        role: "FAMILY",
        applicationId: appA1Id,
        fileName: "evil.exe",
        bytes: Buffer.from("MZ not a real pe but no magic"),
        awaitScan: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_FILE_TYPE" } satisfies Partial<DocumentError>);

    const big = Buffer.concat([samplePdf(), Buffer.alloc(2048)]);
    await expect(
      uploadApplicationDocument({
        userId: familyAId,
        role: "FAMILY",
        applicationId: appA1Id,
        fileName: "big.pdf",
        bytes: big,
        awaitScan: true,
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" } satisfies Partial<DocumentError>);
  });

  it("uploads PDF, staff of site can download bytes, other family/site cannot", async () => {
    const payload = samplePdf(`doc-${Date.now()}`);
    const doc = await uploadApplicationDocument({
      userId: familyAId,
      role: "FAMILY",
      applicationId: appA1Id,
      fileName: "admission.pdf",
      bytes: payload,
      awaitScan: true,
    });
    expect(doc.status).toBe("AVAILABLE");
    expect(doc.scanAdapter).toBe("dev-passthrough");
    expect(doc.scanResult).toBe("skipped_dev");
    expect(doc.storageKey.includes("admission.pdf")).toBe(false);

    await expect(
      issueDocumentAccessUrl({
        userId: familyBId,
        role: "FAMILY",
        documentId: doc.id,
        disposition: "attachment",
      }),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<AuthzError>);

    await expect(
      issueDocumentAccessUrl({
        userId: staffOtherId,
        role: "STAFF",
        documentId: doc.id,
        disposition: "attachment",
      }),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<AuthzError>);

    const access = await issueDocumentAccessUrl({
      userId: staffSite1Id,
      role: "STAFF",
      documentId: doc.id,
      disposition: "attachment",
    });
    const res = await fetch(access.url);
    expect(res.ok).toBe(true);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(payload)).toBe(true);
    expect(res.headers.get("content-type") || "").toContain("pdf");
  });

  it("blocks staff while quarantined and after soft-delete", async () => {
    const doc = await uploadApplicationDocument({
      userId: familyAId,
      role: "FAMILY",
      applicationId: appA1Id,
      fileName: "scan.jpg",
      bytes: sampleJpeg(),
      awaitScan: true,
    });
    await forceQuarantineForTests(doc.id);

    await expect(
      issueDocumentAccessUrl({
        userId: staffSite1Id,
        role: "STAFF",
        documentId: doc.id,
        disposition: "inline",
      }),
    ).rejects.toMatchObject({ status: 404 });

    // Re-upload clean then delete
    const ok = await uploadApplicationDocument({
      userId: familyAId,
      role: "FAMILY",
      applicationId: appA1Id,
      fileName: "keep.pdf",
      bytes: samplePdf("delete-me"),
      awaitScan: true,
    });
    await softDeleteDocument({
      userId: familyAId,
      role: "FAMILY",
      documentId: ok.id,
    });
    await expect(
      issueDocumentAccessUrl({
        userId: staffSite1Id,
        role: "STAFF",
        documentId: ok.id,
        disposition: "attachment",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects expired signed URLs", async () => {
    const doc = await uploadApplicationDocument({
      userId: familyAId,
      role: "FAMILY",
      applicationId: appA1Id,
      fileName: "ttl.pdf",
      bytes: samplePdf("ttl"),
      awaitScan: true,
    });
    const access = await issueDocumentAccessUrl({
      userId: staffSite1Id,
      role: "STAFF",
      documentId: doc.id,
      disposition: "attachment",
      expiresInSeconds: 1,
    });
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(access.url);
    expect(res.ok).toBe(false);
  }, 10_000);
});
