import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  assertCanAccessApplication,
  assertCanAccessDocument,
  assertCanAccessFamily,
  AuthzError,
  listAccessibleSiteIds,
} from "@/lib/authz";
import {
  getApplicationForUser,
  listFamilyApplications,
  listStaffApplications,
} from "@/lib/applications";
import { envSchema, resetEnvCache } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const prisma = new PrismaClient();

describe("argon2id passwords", () => {
  it("hashes and verifies with argon2id", async () => {
    const hash = await hashPassword("DevOnlyPass123!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "DevOnlyPass123!")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
});

describe("rate limit", () => {
  it("blocks after limit", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) {
      expect(rateLimit({ key: "t", limit: 3, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(rateLimit({ key: "t", limit: 3, windowMs: 60_000 }).ok).toBe(false);
  });
});

describe("permission isolation (integration)", () => {
  let familyAId: string;
  let familyBId: string;
  let staffSite1Id: string;
  let staffOtherId: string;
  let appA1Id: string;
  let appB2Id: string;
  let docA1Id: string;

  beforeAll(async () => {
    resetEnvCache();
    envSchema.parse({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-at-least-16-chars",
      DATABASE_URL: process.env.DATABASE_URL,
      STORAGE_DRIVER: "minio",
      STORAGE_ENDPOINT: "http://localhost:9000",
      STORAGE_BUCKET: "haven-private",
      STORAGE_ACCESS_KEY_ID: "minioadmin",
      STORAGE_SECRET_ACCESS_KEY: "minioadmin",
      EMAIL_DRIVER: "smtp",
      EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
    });

    const familyA = await prisma.user.findUniqueOrThrow({
      where: { email: "family.a@havenapply.local" },
    });
    const familyB = await prisma.user.findUniqueOrThrow({
      where: { email: "family.b@havenapply.local" },
    });
    const staff1 = await prisma.user.findUniqueOrThrow({
      where: { email: "staff.site1@havenapply.local" },
    });
    const staff2 = await prisma.user.findUniqueOrThrow({
      where: { email: "staff.other@havenapply.local" },
    });
    const appA1 = await prisma.application.findUniqueOrThrow({
      where: { publicRef: "HA-SEED-A1" },
    });
    const appB2 = await prisma.application.findUniqueOrThrow({
      where: { publicRef: "HA-SEED-B2" },
    });
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: "seed-doc-a1" } });

    familyAId = familyA.id;
    familyBId = familyB.id;
    staffSite1Id = staff1.id;
    staffOtherId = staff2.id;
    appA1Id = appA1.id;
    appB2Id = appB2.id;
    docA1Id = doc.id;
  });

  it("family A cannot access family B profile", async () => {
    const profileB = await prisma.familyProfile.findUniqueOrThrow({
      where: { id: "seed-family-b" },
    });
    await expect(assertCanAccessFamily(familyAId, profileB.id, "FAMILY")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<AuthzError>);
  });

  it("family A cannot open family B application", async () => {
    await expect(
      getApplicationForUser(familyAId, "FAMILY", appB2Id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("family A can open own application", async () => {
    const app = await getApplicationForUser(familyAId, "FAMILY", appA1Id);
    expect(app.id).toBe(appA1Id);
  });

  it("staff site1 cannot see site2 applications", async () => {
    const list = await listStaffApplications(staffSite1Id, "STAFF", {
      q: "HA-SEED-A1",
      pageSize: 50,
    });
    expect(list.items.some((a) => a.id === appA1Id)).toBe(true);

    const other = await listStaffApplications(staffSite1Id, "STAFF", {
      q: "HA-SEED-B2",
      pageSize: 50,
    });
    expect(other.items.some((a) => a.id === appB2Id)).toBe(false);
    expect(other.total).toBe(0);
  });

  it("staff other site gets 404 on site1 application", async () => {
    await expect(
      assertCanAccessApplication(staffOtherId, appA1Id, "STAFF"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("staff other cannot download family A document", async () => {
    await expect(
      assertCanAccessDocument(staffOtherId, docA1Id, "STAFF"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("family B list does not include family A apps", async () => {
    const list = await listFamilyApplications(familyBId, "FAMILY");
    expect(list.every((a) => a.id !== appA1Id)).toBe(true);
  });

  it("staff site1 accessible sites exclude site2", async () => {
    const sites = await listAccessibleSiteIds(staffSite1Id);
    expect(sites).toContain("seed-site-1");
    expect(sites).not.toContain("seed-site-2");
  });
});
