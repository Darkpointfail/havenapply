import { ApplicationStatus, CaregiverRole, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCanAccessApplication,
  assertCanMutateFamily,
  assertStaffPermission,
  listAccessibleFamilyIds,
  listAccessibleSiteIds,
  AuthzError,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { generateApplicationPublicRef } from "@/lib/application-ref";
import {
  applicationDraftFieldsSchema,
  applicationSubmitPayloadSchema,
  type ApplicationDraftFields,
} from "@/lib/application-schema";
import {
  assertTransition,
  staffVisibleStatuses,
  transitionActorForRole,
} from "@/lib/application-status";

export class ApplicationError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
  }
}

async function assertSiteAcceptsSubmissions(siteId: string) {
  const site = await prisma.residenceSite.findUnique({
    where: { id: siteId },
    include: { organization: true },
  });
  if (!site) throw new AuthzError("SITE_NOT_FOUND", 404);
  if (!site.isActive || !site.isVerified) {
    throw new ApplicationError("SITE_NOT_ACCEPTING", 422);
  }
  if (!site.organization.isActive || !site.organization.isVerified) {
    throw new ApplicationError("ORG_NOT_ACCEPTING", 422);
  }
  return site;
}

export async function listActiveVerifiedSites() {
  return prisma.residenceSite.findMany({
    where: {
      isActive: true,
      isVerified: true,
      organization: { isActive: true, isVerified: true },
    },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
}

export async function getPrimaryFamilyProfileId(userId: string): Promise<string> {
  const membership = await prisma.caregiverMembership.findFirst({
    where: {
      userId,
      acceptedAt: { not: null },
      role: { in: [CaregiverRole.OWNER, CaregiverRole.EDITOR] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new AuthzError("FAMILY_NOT_FOUND", 404);
  return membership.familyProfileId;
}

export async function listFamilyApplications(userId: string, role: Role) {
  if (role === "ADMIN") {
    return prisma.application.findMany({
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  const familyIds = await listAccessibleFamilyIds(userId);
  return prisma.application.findMany({
    where: { familyProfileId: { in: familyIds } },
    include: { site: true, family: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listStaffApplications(userId: string, role: Role) {
  const visible = staffVisibleStatuses();
  if (role === "ADMIN") {
    return prisma.application.findMany({
      where: { status: { in: visible } },
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (role !== "STAFF") throw new AuthzError("FORBIDDEN", 403);
  const sites = await listAccessibleSiteIds(userId);
  if (sites === "ALL") {
    return prisma.application.findMany({
      where: { status: { in: visible } },
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  return prisma.application.findMany({
    where: { siteId: { in: sites }, status: { in: visible } },
    include: { site: true, family: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApplicationForUser(
  userId: string,
  role: Role,
  applicationId: string,
  options?: { auditView?: boolean; ipAddress?: string | null },
) {
  await assertCanAccessApplication(userId, applicationId, role);
  const app = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      site: { include: { organization: true } },
      family: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      documents: true,
    },
  });

  if (options?.auditView) {
    await writeAudit({
      actorUserId: userId,
      action: "application.viewed",
      entityType: "Application",
      entityId: applicationId,
      metadata: { status: app.status, publicRef: app.publicRef },
      ipAddress: options.ipAddress,
    });
  }

  return app;
}

export async function createDraftApplication(input: {
  userId: string;
  role: Role;
  familyProfileId?: string;
  siteId: string;
  ipAddress?: string | null;
}) {
  if (input.role !== "FAMILY" && input.role !== "ADMIN") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const familyProfileId =
    input.familyProfileId || (await getPrimaryFamilyProfileId(input.userId));
  await assertCanMutateFamily(input.userId, familyProfileId, input.role);
  await assertSiteAcceptsSubmissions(input.siteId);

  let publicRef = generateApplicationPublicRef();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.application.create({
        data: {
          familyProfileId,
          siteId: input.siteId,
          status: "DRAFT",
          publicRef,
          draftStep: 2,
          statusHistory: {
            create: {
              toStatus: "DRAFT",
              changedByUserId: input.userId,
              note: "Draft created",
            },
          },
        },
        include: { site: true, family: true },
      });

      await writeAudit({
        actorUserId: input.userId,
        action: "application.created",
        entityType: "Application",
        entityId: created.id,
        metadata: { publicRef: created.publicRef, siteId: input.siteId },
        ipAddress: input.ipAddress,
      });

      return created;
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code === "P2002") {
        publicRef = generateApplicationPublicRef();
        continue;
      }
      throw error;
    }
  }
  throw new ApplicationError("PUBLIC_REF_COLLISION", 500);
}

export async function updateDraftApplication(input: {
  userId: string;
  role: Role;
  applicationId: string;
  fields: ApplicationDraftFields;
  ipAddress?: string | null;
}) {
  const app = await assertCanAccessApplication(
    input.userId,
    input.applicationId,
    input.role,
  );
  await assertCanMutateFamily(input.userId, app.familyProfileId, input.role);

  const current = await prisma.application.findUniqueOrThrow({
    where: { id: input.applicationId },
  });
  if (current.status !== "DRAFT") {
    throw new ApplicationError("NOT_A_DRAFT", 409);
  }

  const parsed = applicationDraftFieldsSchema.safeParse(input.fields);
  if (!parsed.success) {
    throw new ApplicationError(parsed.error.issues[0]?.message || "VALIDATION_FAILED", 400);
  }

  const data = parsed.data;
  return prisma.application.update({
    where: { id: input.applicationId },
    data: {
      residentPreferredName: data.residentPreferredName ?? current.residentPreferredName,
      residentBirthYear: data.residentBirthYear ?? current.residentBirthYear,
      contactName: data.contactName ?? current.contactName,
      contactEmail: data.contactEmail ?? current.contactEmail,
      contactPhone: data.contactPhone ?? current.contactPhone,
      preferredMoveMonth:
        data.preferredMoveMonth === undefined
          ? current.preferredMoveMonth
          : data.preferredMoveMonth || null,
      urgencyNote:
        data.urgencyNote === undefined ? current.urgencyNote : data.urgencyNote || null,
      draftStep: data.draftStep ?? current.draftStep,
    },
    include: { site: true, family: true },
  });
}

/**
 * Idempotent transactional submit.
 * Retries with the same idempotencyKey return the already-submitted application.
 */
export async function submitApplication(input: {
  userId: string;
  role: Role;
  applicationId: string;
  idempotencyKey: string;
  consentPrivacy: boolean;
  consentShareWithSite: boolean;
  ipAddress?: string | null;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new ApplicationError("IDEMPOTENCY_KEY_REQUIRED", 400);
  }

  const access = await assertCanAccessApplication(
    input.userId,
    input.applicationId,
    input.role,
  );
  await assertCanMutateFamily(input.userId, access.familyProfileId, input.role);

  // Fast path: same key already used on this or another app
  const byKey = await prisma.application.findUnique({
    where: { submitIdempotencyKey: input.idempotencyKey },
    include: { site: true, family: true },
  });
  if (byKey) {
    if (byKey.id !== input.applicationId) {
      throw new ApplicationError("IDEMPOTENCY_KEY_REUSED", 409);
    }
    return byKey;
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.application.findUniqueOrThrow({
      where: { id: input.applicationId },
    });

    if (current.status === "SUBMITTED" && current.submitIdempotencyKey === input.idempotencyKey) {
      return tx.application.findUniqueOrThrow({
        where: { id: input.applicationId },
        include: { site: true, family: true },
      });
    }

    if (current.status !== "DRAFT") {
      throw new ApplicationError("NOT_A_DRAFT", 409);
    }

    assertTransition(current.status, "SUBMITTED", transitionActorForRole(input.role));

    const site = await tx.residenceSite.findUniqueOrThrow({
      where: { id: current.siteId },
      include: { organization: true },
    });
    if (!site.isActive || !site.isVerified) {
      throw new ApplicationError("SITE_NOT_ACCEPTING", 422);
    }
    if (!site.organization.isActive || !site.organization.isVerified) {
      throw new ApplicationError("ORG_NOT_ACCEPTING", 422);
    }

    const payload = applicationSubmitPayloadSchema.safeParse({
      residentPreferredName: current.residentPreferredName,
      residentBirthYear: current.residentBirthYear,
      contactName: current.contactName,
      contactEmail: current.contactEmail,
      contactPhone: current.contactPhone,
      preferredMoveMonth: current.preferredMoveMonth ?? undefined,
      urgencyNote: current.urgencyNote ?? undefined,
      consentPrivacy: input.consentPrivacy,
      consentShareWithSite: input.consentShareWithSite,
    });
    if (!payload.success) {
      throw new ApplicationError(
        payload.error.issues[0]?.message || "VALIDATION_FAILED",
        400,
      );
    }

    const now = new Date();
    const updated = await tx.application.update({
      where: { id: input.applicationId },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        consentPrivacy: true,
        consentShareWithSite: true,
        consentAt: now,
        submitIdempotencyKey: input.idempotencyKey,
        draftStep: 4,
      },
      include: { site: true, family: true },
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: ApplicationStatus.DRAFT,
        toStatus: ApplicationStatus.SUBMITTED,
        changedByUserId: input.userId,
        note: "Submitted by family",
      },
    });

    return updated;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "application.submitted",
    entityType: "Application",
    entityId: input.applicationId,
    metadata: { publicRef: result.publicRef, siteId: result.siteId },
    ipAddress: input.ipAddress,
  });

  return result;
}

export async function changeApplicationStatus(input: {
  userId: string;
  role: Role;
  applicationId: string;
  toStatus: ApplicationStatus;
  note?: string;
  ipAddress?: string | null;
}) {
  const app = await assertCanAccessApplication(
    input.userId,
    input.applicationId,
    input.role,
  );

  const actor = transitionActorForRole(input.role);

  if (input.role === "STAFF") {
    const site = await prisma.residenceSite.findUniqueOrThrow({
      where: { id: app.siteId },
    });
    await assertStaffPermission(
      input.userId,
      site.organizationId,
      "MANAGE_APPLICATIONS",
      site.id,
    );
  } else if (input.role === "FAMILY") {
    await assertCanMutateFamily(input.userId, app.familyProfileId, input.role);
  } else if (input.role !== "ADMIN") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const current = await prisma.application.findUniqueOrThrow({
    where: { id: input.applicationId },
  });

  try {
    assertTransition(current.status, input.toStatus, actor);
  } catch {
    throw new ApplicationError("INVALID_TRANSITION", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.application.update({
      where: { id: input.applicationId },
      data: {
        status: input.toStatus,
        submittedAt:
          input.toStatus === "SUBMITTED" && !current.submittedAt
            ? new Date()
            : current.submittedAt,
      },
    });
    await tx.applicationStatusHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: current.status,
        toStatus: input.toStatus,
        changedByUserId: input.userId,
        note: input.note?.slice(0, 200) || null,
      },
    });
    return next;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "application.status_changed",
    entityType: "Application",
    entityId: input.applicationId,
    metadata: { from: current.status, to: input.toStatus },
    ipAddress: input.ipAddress,
  });

  return updated;
}

export async function validateApplicationForSubmit(applicationId: string) {
  const current = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
  });
  return applicationSubmitPayloadSchema.safeParse({
    residentPreferredName: current.residentPreferredName,
    residentBirthYear: current.residentBirthYear,
    contactName: current.contactName,
    contactEmail: current.contactEmail,
    contactPhone: current.contactPhone,
    preferredMoveMonth: current.preferredMoveMonth ?? undefined,
    urgencyNote: current.urgencyNote ?? undefined,
    consentPrivacy: true,
    consentShareWithSite: true,
  });
}
