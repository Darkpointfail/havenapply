import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  ApplicationError,
  createDraftApplication,
  submitApplication,
  transitionApplicationStatus,
  updateDraftApplication,
} from "@/lib/applications";
import { AuthzError } from "@/lib/authz";
import { envSchema, resetEnvCache } from "@/lib/env";
import { generateRawToken } from "@/lib/crypto";
import { dispatchOutbox } from "@/lib/outbox";

const prisma = new PrismaClient();

async function makeSubmitted(familyUserId: string, suffix: string) {
  const draft = await createDraftApplication({
    userId: familyUserId,
    role: "FAMILY",
    siteId: "seed-site-1",
  });
  await updateDraftApplication({
    userId: familyUserId,
    role: "FAMILY",
    applicationId: draft.id,
    fields: {
      residentPreferredName: `Admit ${suffix}`,
      residentBirthYear: 1942,
      contactName: "Family A Owner",
      contactEmail: "family.a@havenapply.local",
      contactPhone: "+14185550111",
      draftStep: 4,
    },
  });
  return submitApplication({
    userId: familyUserId,
    role: "FAMILY",
    applicationId: draft.id,
    idempotencyKey: generateRawToken(12),
    consentPrivacy: true,
    consentShareWithSite: true,
  });
}

describe("staff admissions workflow integration", () => {
  let familyAId: string;
  let staffOwnerId: string;
  let staffEditorId: string;
  let staffViewerId: string;
  let staffOtherId: string;

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

    familyAId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.a@havenapply.local" } })
    ).id;
    staffOwnerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.site1@havenapply.local" } })
    ).id;
    staffEditorId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.editor@havenapply.local" } })
    ).id;
    staffViewerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.viewer@havenapply.local" } })
    ).id;
    staffOtherId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.other@havenapply.local" } })
    ).id;
  });

  it("OWNER can move SUBMITTED → UNDER_REVIEW and creates a unique outbox row", async () => {
    const app = await makeSubmitted(familyAId, `ur-${Date.now()}`);
    const key = generateRawToken(16);
    const updated = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: key,
      locale: "fr",
    });
    expect(updated.status).toBe("UNDER_REVIEW");
    expect(updated.version).toBe(app.version + 1);

    const outbox = await prisma.outboxEvent.findMany({
      where: { idempotencyKey: `notify:${key}` },
    });
    expect(outbox).toHaveLength(1);

    const again = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: key,
      locale: "fr",
    });
    expect(again.status).toBe("UNDER_REVIEW");
    expect(
      await prisma.outboxEvent.count({ where: { idempotencyKey: `notify:${key}` } }),
    ).toBe(1);

    await dispatchOutbox();
  });

  it("rejects invalid transitions server-side", async () => {
    const app = await makeSubmitted(familyAId, `bad-${Date.now()}`);
    await expect(
      transitionApplicationStatus({
        userId: staffOwnerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: app.version,
        toStatus: "DRAFT",
        idempotencyKey: generateRawToken(16),
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" } satisfies Partial<ApplicationError>);
  });

  it("VIEWER cannot mutate; EDITOR can; other residence cannot access", async () => {
    const app = await makeSubmitted(familyAId, `authz-${Date.now()}`);

    await expect(
      transitionApplicationStatus({
        userId: staffViewerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: app.version,
        toStatus: "UNDER_REVIEW",
        idempotencyKey: generateRawToken(16),
      }),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AuthzError>);

    await expect(
      transitionApplicationStatus({
        userId: staffOtherId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: app.version,
        toStatus: "UNDER_REVIEW",
        idempotencyKey: generateRawToken(16),
      }),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<AuthzError>);

    const byEditor = await transitionApplicationStatus({
      userId: staffEditorId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: generateRawToken(16),
    });
    expect(byEditor.status).toBe("UNDER_REVIEW");
  });

  it("detects version conflicts on concurrent updates", async () => {
    const app = await makeSubmitted(familyAId, `ver-${Date.now()}`);
    await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: generateRawToken(16),
    });

    await expect(
      transitionApplicationStatus({
        userId: staffOwnerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: app.version,
        toStatus: "ACCEPTED",
        idempotencyKey: generateRawToken(16),
        familyMessage: "Bienvenue",
        nextSteps: "Visite",
      }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" } satisfies Partial<ApplicationError>);
  });

  it("separates internal notes from family messages on REJECTED and NEEDS_DOCUMENTS", async () => {
    const app = await makeSubmitted(familyAId, `notes-${Date.now()}`);
    const needs = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "NEEDS_DOCUMENTS",
      idempotencyKey: generateRawToken(16),
      familyMessage: "Merci de fournir une pièce d'identité",
      requestedDocuments: ["Pièce d'identité"],
      internalNote: "SECRET_INTERNAL_NOTE_NEVER_EMAIL",
      locale: "fr",
    });
    const histNeeds = needs.statusHistory.find((h) => h.toStatus === "NEEDS_DOCUMENTS");
    expect(histNeeds?.internalNote).toContain("SECRET_INTERNAL");
    expect(histNeeds?.familyMessage).toContain("pièce");

    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: app.id },
      orderBy: { createdAt: "desc" },
    });
    const payload = outbox?.payload as { text?: string; subject?: string };
    expect(payload?.text || "").not.toContain("SECRET_INTERNAL");
    expect(JSON.stringify(payload)).not.toContain("Pièce d'identité");

    const reviewed = await transitionApplicationStatus({
      userId: familyAId,
      role: "FAMILY",
      applicationId: app.id,
      expectedStatus: "NEEDS_DOCUMENTS",
      expectedVersion: needs.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: generateRawToken(16),
      familyMessage: "Documents téléversés",
      locale: "fr",
    });
    expect(reviewed.status).toBe("UNDER_REVIEW");

    const rejected = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "UNDER_REVIEW",
      expectedVersion: reviewed.version,
      toStatus: "REJECTED",
      idempotencyKey: generateRawToken(16),
      internalNote: "Capacité pleine — motif interne",
      familyMessage: "Nous ne pouvons pas donner suite pour le moment.",
      locale: "fr",
    });
    const histReject = rejected.statusHistory.find((h) => h.toStatus === "REJECTED");
    expect(histReject?.internalNote).toContain("Capacité");
    expect(histReject?.familyMessage).toContain("donner suite");
    expect(histReject?.familyMessage).not.toContain("Capacité");
  });

  it("requires motifs for NEEDS_DOCUMENTS / REJECTED / reopen", async () => {
    const app = await makeSubmitted(familyAId, `motif-${Date.now()}`);
    await expect(
      transitionApplicationStatus({
        userId: staffOwnerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: app.version,
        toStatus: "NEEDS_DOCUMENTS",
        idempotencyKey: generateRawToken(16),
        familyMessage: "msg",
      }),
    ).rejects.toMatchObject({ code: "REQUESTED_DOCUMENTS_REQUIRED" });

    const accepted = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "ACCEPTED",
      idempotencyKey: generateRawToken(16),
      familyMessage: "Bienvenue",
      nextSteps: "Appel sous 48h",
    });

    await expect(
      transitionApplicationStatus({
        userId: staffOwnerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "ACCEPTED",
        expectedVersion: accepted.version,
        toStatus: "UNDER_REVIEW",
        idempotencyKey: generateRawToken(16),
      }),
    ).rejects.toMatchObject({ code: "REOPEN_REASON_REQUIRED" });

    const reopened = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "ACCEPTED",
      expectedVersion: accepted.version,
      toStatus: "UNDER_REVIEW",
      idempotencyKey: generateRawToken(16),
      reopenReason: "Erreur de décision — à revoir",
    });
    expect(reopened.status).toBe("UNDER_REVIEW");
    expect(reopened.statusHistory.some((h) => h.isReopen)).toBe(true);
  });

  it("EDITOR cannot reopen terminals (OWNER only)", async () => {
    const app = await makeSubmitted(familyAId, `reopen-deny-${Date.now()}`);
    const accepted = await transitionApplicationStatus({
      userId: staffOwnerId,
      role: "STAFF",
      applicationId: app.id,
      expectedStatus: "SUBMITTED",
      expectedVersion: app.version,
      toStatus: "ACCEPTED",
      idempotencyKey: generateRawToken(16),
      familyMessage: "ok",
    });
    await expect(
      transitionApplicationStatus({
        userId: staffViewerId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "ACCEPTED",
        expectedVersion: accepted.version,
        toStatus: "UNDER_REVIEW",
        idempotencyKey: generateRawToken(16),
        reopenReason: "should fail",
      }),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AuthzError>);

    await expect(
      transitionApplicationStatus({
        userId: staffEditorId,
        role: "STAFF",
        applicationId: app.id,
        expectedStatus: "ACCEPTED",
        expectedVersion: accepted.version,
        toStatus: "UNDER_REVIEW",
        idempotencyKey: generateRawToken(16),
        reopenReason: "editor cannot reopen",
      }),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AuthzError>);
  });
});
