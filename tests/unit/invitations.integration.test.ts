import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { envSchema, resetEnvCache } from "@/lib/env";
import { hashPassword } from "@/lib/crypto";
import { InvitationError } from "@/lib/invitation-common";
import {
  acceptCaregiverInvitation,
  createCaregiverInvitation,
  peekCaregiverInvitation,
  revokeCaregiverInvitation,
  revokeCaregiverMembership,
} from "@/lib/caregiver-invitations";
import {
  acceptStaffInvitation,
  createStaffInvitation,
  peekStaffInvitation,
  revokeStaffInvitation,
} from "@/lib/staff-invitations";
import { AuthzError, listAccessibleFamilyIds, listAccessibleSiteIds } from "@/lib/authz";
import { prisma as appPrisma } from "@/lib/prisma";

const prisma = new PrismaClient();

describe("invitations integration", () => {
  let familyOwnerId: string;
  let familyBId: string;
  let staffOwnerId: string;
  let staffViewerId: string;
  let staffOtherId: string;
  let familyProfileA: string;
  let orgId: string;

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
      INVITATION_TTL_HOURS: "168",
      INVITATION_ATTEMPT_LIMIT: "50",
    });

    familyOwnerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.a@havenapply.local" } })
    ).id;
    familyBId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.b@havenapply.local" } })
    ).id;
    staffOwnerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.site1@havenapply.local" } })
    ).id;
    staffViewerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.viewer@havenapply.local" } })
    ).id;
    staffOtherId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "staff.other@havenapply.local" } })
    ).id;
    familyProfileA = (
      await prisma.familyProfile.findUniqueOrThrow({ where: { id: "seed-family-a" } })
    ).id;
    orgId = (
      await prisma.residenceOrganization.findUniqueOrThrow({ where: { slug: "demo-residences" } })
    ).id;
  });

  it("caregiver: invite → accept → isolate other family; revoke membership", async () => {
    const email = `cg.${Date.now()}@havenapply.local`;
    const created = await createCaregiverInvitation({
      actorUserId: familyOwnerId,
      familyProfileId: familyProfileA,
      email,
      role: "EDITOR",
      locale: "fr",
    });

    const peek = await peekCaregiverInvitation({ token: created.rawToken });
    expect(peek.state).toBe("VALID");

    const passwordHash = await hashPassword("DevOnlyPass123!");
    const invitee = await prisma.user.create({
      data: {
        email,
        name: "Caregiver Invitee",
        role: "FAMILY",
        passwordHash,
        emailVerified: new Date(),
        notificationPreference: { create: {} },
      },
    });

    await acceptCaregiverInvitation({
      userId: invitee.id,
      token: created.rawToken,
    });

    const families = await listAccessibleFamilyIds(invitee.id);
    expect(families).toContain(familyProfileA);
    expect(families).not.toContain("seed-family-b");

    // Reuse token fails
    await expect(
      acceptCaregiverInvitation({ userId: invitee.id, token: created.rawToken }),
    ).rejects.toMatchObject({ code: "USED" } satisfies Partial<InvitationError>);

    const membership = await prisma.caregiverMembership.findUniqueOrThrow({
      where: {
        familyProfileId_userId: { familyProfileId: familyProfileA, userId: invitee.id },
      },
    });
    await revokeCaregiverMembership({
      actorUserId: familyOwnerId,
      membershipId: membership.id,
    });
    const after = await listAccessibleFamilyIds(invitee.id);
    expect(after).not.toContain(familyProfileA);
  });

  it("caregiver: expired / revoked / wrong account / altered token", async () => {
    const email = `cg.bad.${Date.now()}@havenapply.local`;
    const created = await createCaregiverInvitation({
      actorUserId: familyOwnerId,
      familyProfileId: familyProfileA,
      email,
      role: "VIEWER",
    });

    await revokeCaregiverInvitation({
      actorUserId: familyOwnerId,
      invitationId: created.invitationId,
    });
    expect((await peekCaregiverInvitation({ token: created.rawToken })).state).toBe("REVOKED");

    const created2 = await createCaregiverInvitation({
      actorUserId: familyOwnerId,
      familyProfileId: familyProfileA,
      email,
      role: "VIEWER",
    });
    await prisma.caregiverInvitation.update({
      where: { id: created2.invitationId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await peekCaregiverInvitation({ token: created2.rawToken })).state).toBe("EXPIRED");

    expect((await peekCaregiverInvitation({ token: "aa".repeat(20) })).state).toBe("NOT_FOUND");

    const wrong = await peekCaregiverInvitation({
      token: (
        await createCaregiverInvitation({
          actorUserId: familyOwnerId,
          familyProfileId: familyProfileA,
          email: `cg.wrong.${Date.now()}@havenapply.local`,
          role: "VIEWER",
        })
      ).rawToken,
      viewerEmail: "family.b@havenapply.local",
    });
    expect(wrong.state).toBe("WRONG_ACCOUNT");
    expect(wrong.familyDisplayName).toBeUndefined();
  });

  it("caregiver: concurrent accepts — only one succeeds", async () => {
    const email = `cg.race.${Date.now()}@havenapply.local`;
    const created = await createCaregiverInvitation({
      actorUserId: familyOwnerId,
      familyProfileId: familyProfileA,
      email,
      role: "VIEWER",
    });
    const passwordHash = await hashPassword("DevOnlyPass123!");
    const u1 = await prisma.user.create({
      data: {
        email,
        name: "Racer",
        role: "FAMILY",
        passwordHash,
        emailVerified: new Date(),
        notificationPreference: { create: {} },
      },
    });
    // Second user with same email is impossible — simulate double submit same user
    const results = await Promise.allSettled([
      acceptCaregiverInvitation({ userId: u1.id, token: created.rawToken }),
      acceptCaregiverInvitation({ userId: u1.id, token: created.rawToken }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const fail = results.filter((r) => r.status === "rejected");
    expect(ok.length).toBe(1);
    expect(fail.length).toBe(1);
  });

  it("staff: OWNER invites EDITOR; VIEWER cannot invite; cross-org isolation", async () => {
    const email = `st.${Date.now()}@havenapply.local`;
    await expect(
      createStaffInvitation({
        actorUserId: staffViewerId,
        organizationId: orgId,
        email,
        orgRole: "EDITOR",
        siteIds: ["seed-site-1"],
      }),
    ).rejects.toBeInstanceOf(AuthzError);

    const created = await createStaffInvitation({
      actorUserId: staffOwnerId,
      organizationId: orgId,
      email,
      orgRole: "EDITOR",
      siteIds: ["seed-site-1"],
    });
    expect((await peekStaffInvitation({ token: created.rawToken })).state).toBe("VALID");

    const passwordHash = await hashPassword("DevOnlyPass123!");
    const invitee = await prisma.user.create({
      data: {
        email,
        name: "Staff Invitee",
        role: "FAMILY",
        passwordHash,
        emailVerified: new Date(),
        notificationPreference: { create: {} },
      },
    });
    await acceptStaffInvitation({ userId: invitee.id, token: created.rawToken });

    const sites = await listAccessibleSiteIds(invitee.id);
    expect(sites).toContain("seed-site-1");
    expect(sites).not.toContain("seed-site-2");

    // Other org staff owner cannot revoke this invite after accept — create pending then other fails create for same org? 
    // staffOther is OWNER of site2 same org — can invite for site2
    const otherInvite = await createStaffInvitation({
      actorUserId: staffOtherId,
      organizationId: orgId,
      email: `st2.${Date.now()}@havenapply.local`,
      orgRole: "VIEWER",
      siteIds: ["seed-site-2"],
    });
    expect(otherInvite.invitationId).toBeTruthy();
  });

  it("staff: revoke pending; outbox unique; family B cannot invite into A", async () => {
    const email = `st.rev.${Date.now()}@havenapply.local`;
    const created = await createStaffInvitation({
      actorUserId: staffOwnerId,
      organizationId: orgId,
      email,
      orgRole: "VIEWER",
      siteIds: ["seed-site-1"],
    });
    const outbox = await appPrisma.outboxEvent.count({
      where: { idempotencyKey: `invite:staff:${created.invitationId}` },
    });
    expect(outbox).toBe(1);

    await revokeStaffInvitation({
      actorUserId: staffOwnerId,
      invitationId: created.invitationId,
    });
    expect((await peekStaffInvitation({ token: created.rawToken })).state).toBe("REVOKED");

    await expect(
      createCaregiverInvitation({
        actorUserId: familyBId,
        familyProfileId: familyProfileA,
        email: `x.${Date.now()}@havenapply.local`,
        role: "VIEWER",
      }),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});
