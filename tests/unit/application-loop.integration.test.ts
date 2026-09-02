import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createDraftApplication,
  getApplicationForUser,
  listStaffApplications,
  submitApplication,
  updateDraftApplication,
  ApplicationError,
} from "@/lib/applications";
import { AuthzError } from "@/lib/authz";
import { envSchema, resetEnvCache } from "@/lib/env";
import { generateRawToken } from "@/lib/crypto";

const prisma = new PrismaClient();

describe("application loop integration", () => {
  let familyAId: string;
  let familyBId: string;
  let staffSite1Id: string;
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
    familyBId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.b@havenapply.local" } })
    ).id;
    staffSite1Id = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.site1@havenapply.local" } })
    ).id;
    staffOtherId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.other@havenapply.local" } })
    ).id;
  });

  it("creates draft, updates, submits transactionally and idempotently", async () => {
    const draft = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: "seed-site-1",
    });
    expect(draft.status).toBe("DRAFT");
    expect(draft.publicRef).toMatch(/^HA-/);

    await updateDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      applicationId: draft.id,
      fields: {
        residentPreferredName: "Claire Test",
        residentBirthYear: 1945,
        contactName: "Family A Owner",
        contactEmail: "family.a@havenapply.local",
        contactPhone: "+14185550999",
        draftStep: 4,
      },
    });

    const key = generateRawToken(12);
    const submitted = await submitApplication({
      userId: familyAId,
      role: "FAMILY",
      applicationId: draft.id,
      idempotencyKey: key,
      consentPrivacy: true,
      consentShareWithSite: true,
    });
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.submittedAt).toBeTruthy();

    const again = await submitApplication({
      userId: familyAId,
      role: "FAMILY",
      applicationId: draft.id,
      idempotencyKey: key,
      consentPrivacy: true,
      consentShareWithSite: true,
    });
    expect(again.id).toBe(submitted.id);
    expect(again.status).toBe("SUBMITTED");

    const history = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: draft.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.some((h) => h.toStatus === "DRAFT")).toBe(true);
    expect(history.filter((h) => h.toStatus === "SUBMITTED")).toHaveLength(1);

    const staffList = await listStaffApplications(staffSite1Id, "STAFF");
    expect(staffList.items.some((a) => a.id === draft.id)).toBe(true);
  });

  it("blocks other family from reading the application", async () => {
    const draft = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: "seed-site-1",
    });
    await expect(
      getApplicationForUser(familyBId, "FAMILY", draft.id),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<AuthzError>);
  });

  it("blocks staff of another site from listing a submitted app", async () => {
    const draft = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: "seed-site-1",
    });
    await updateDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      applicationId: draft.id,
      fields: {
        residentPreferredName: "Other Site Check",
        residentBirthYear: 1941,
        contactName: "A",
        contactEmail: "family.a@havenapply.local",
        contactPhone: "+14185550888",
      },
    });
    await submitApplication({
      userId: familyAId,
      role: "FAMILY",
      applicationId: draft.id,
      idempotencyKey: generateRawToken(12),
      consentPrivacy: true,
      consentShareWithSite: true,
    });

    const otherList = await listStaffApplications(staffOtherId, "STAFF");
    expect(otherList.items.some((a) => a.id === draft.id)).toBe(false);
  });

  it("rejects submit when site is inactive", async () => {
    const inactive = await prisma.residenceSite.create({
      data: {
        name: "Inactive Site",
        city: "Test",
        organizationId: (await prisma.residenceOrganization.findUniqueOrThrow({
          where: { slug: "demo-residences" },
        })).id,
        isActive: false,
        isVerified: true,
      },
    });

    await expect(
      createDraftApplication({
        userId: familyAId,
        role: "FAMILY",
        siteId: inactive.id,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);

    await prisma.residenceSite.delete({ where: { id: inactive.id } });
  });
});
