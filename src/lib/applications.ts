import { ApplicationStatus, CaregiverRole, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCanAccessApplication,
  assertCanMutateFamily,
  assertCanMutateStaffApplication,
  assertStaffOwnerForReopen,
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
  isReopenTransition,
  staffVisibleStatuses,
  transitionActorForRole,
} from "@/lib/application-status";
import { applicationStatusEmail, dispatchOutbox, enqueueOutbox } from "@/lib/outbox";

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

export async function listStaffApplications(
  userId: string,
  role: Role,
  filters?: {
    status?: ApplicationStatus | ApplicationStatus[];
    siteId?: string;
    q?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters?.pageSize ?? 20));
  const visible = staffVisibleStatuses();
  const statusFilter = filters?.status
    ? Array.isArray(filters.status)
      ? filters.status
      : [filters.status]
    : visible;

  const whereBase: {
    status: { in: ApplicationStatus[] };
    siteId?: string | { in: string[] };
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<Record<string, unknown>>;
  } = {
    status: { in: statusFilter.filter((s) => visible.includes(s)) },
  };

  if (filters?.from || filters?.to) {
    whereBase.createdAt = {};
    if (filters.from) whereBase.createdAt.gte = filters.from;
    if (filters.to) whereBase.createdAt.lte = filters.to;
  }

  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    whereBase.OR = [
      { publicRef: { contains: q, mode: "insensitive" } },
      { residentPreferredName: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { family: { displayName: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (role === "ADMIN") {
    if (filters?.siteId) whereBase.siteId = filters.siteId;
  } else if (role === "STAFF") {
    const sites = await listAccessibleSiteIds(userId);
    if (sites === "ALL") {
      if (filters?.siteId) whereBase.siteId = filters.siteId;
    } else {
      if (filters?.siteId) {
        if (!sites.includes(filters.siteId)) {
          return { items: [], total: 0, page, pageSize };
        }
        whereBase.siteId = filters.siteId;
      } else {
        whereBase.siteId = { in: sites };
      }
    }
  } else {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const [total, items] = await Promise.all([
    prisma.application.count({ where: whereBase }),
    prisma.application.findMany({
      where: whereBase,
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
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

/**
 * Authoritative status transition with:
 * - expected previous status + optimistic version
 * - idempotency key
 * - role/orgRole checks (never trust client site/org ids)
 * - internal vs family-facing messages
 * - transactional outbox notification
 */
export async function transitionApplicationStatus(input: {
  userId: string;
  role: Role;
  applicationId: string;
  expectedStatus: ApplicationStatus;
  expectedVersion: number;
  toStatus: ApplicationStatus;
  idempotencyKey: string;
  internalNote?: string | null;
  familyMessage?: string | null;
  requestedDocuments?: string[];
  waitlistPosition?: number | null;
  nextSteps?: string | null;
  /** Required when reopening ACCEPTED/REJECTED. */
  reopenReason?: string | null;
  /** PLATFORM_ADMIN exceptional path — audited. */
  platformAdminOverride?: boolean;
  ipAddress?: string | null;
  locale?: string;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new ApplicationError("IDEMPOTENCY_KEY_REQUIRED", 400);
  }

  const existing = await prisma.applicationStatusHistory.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return prisma.application.findUniqueOrThrow({
      where: { id: existing.applicationId },
      include: { site: true, family: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
  }

  const access = await assertCanAccessApplication(
    input.userId,
    input.applicationId,
    input.role,
  );

  const isReopen = isReopenTransition(input.expectedStatus, input.toStatus);
  const actor = transitionActorForRole(input.role);

  if (input.role === "STAFF") {
    if (isReopen) {
      await assertStaffOwnerForReopen(input.userId, access.siteId);
    } else {
      await assertCanMutateStaffApplication(input.userId, access.siteId);
    }
  } else if (input.role === "FAMILY") {
    await assertCanMutateFamily(input.userId, access.familyProfileId, input.role);
  } else if (input.role === "ADMIN") {
    if (!input.platformAdminOverride && !isReopen) {
      // ADMIN may act as staff without override for normal transitions.
    }
    if (input.platformAdminOverride) {
      await writeAudit({
        actorUserId: input.userId,
        action: "application.platform_admin_override",
        entityType: "Application",
        entityId: input.applicationId,
        metadata: { to: input.toStatus, expected: input.expectedStatus },
        ipAddress: input.ipAddress,
      });
    }
  } else {
    throw new AuthzError("FORBIDDEN", 403);
  }

  // Validate motifs before locking
  if (input.toStatus === "NEEDS_DOCUMENTS") {
    if (!input.familyMessage?.trim()) {
      throw new ApplicationError("FAMILY_MESSAGE_REQUIRED", 400);
    }
    if (!input.requestedDocuments?.length) {
      throw new ApplicationError("REQUESTED_DOCUMENTS_REQUIRED", 400);
    }
  }
  if (input.toStatus === "REJECTED") {
    if (!input.internalNote?.trim()) {
      throw new ApplicationError("INTERNAL_NOTE_REQUIRED", 400);
    }
    if (!input.familyMessage?.trim()) {
      throw new ApplicationError("FAMILY_MESSAGE_REQUIRED", 400);
    }
  }
  if (isReopen && !input.reopenReason?.trim()) {
    throw new ApplicationError("REOPEN_REASON_REQUIRED", 400);
  }

  try {
    assertTransition(input.expectedStatus, input.toStatus, actor, {
      allowReopen: isReopen,
    });
  } catch {
    throw new ApplicationError("INVALID_TRANSITION", 409);
  }

  const locale = input.locale === "en" ? "en" : "fr";
  const outboxKey = `notify:${input.idempotencyKey}`;

  const updated = await prisma.$transaction(async (tx) => {
    const locked = await tx.application.updateMany({
      where: {
        id: input.applicationId,
        status: input.expectedStatus,
        version: input.expectedVersion,
      },
      data: {
        status: input.toStatus,
        version: { increment: 1 },
        submittedAt:
          input.toStatus === "SUBMITTED" ? new Date() : undefined,
      },
    });
    if (locked.count !== 1) {
      throw new ApplicationError("VERSION_CONFLICT", 409);
    }

    const next = await tx.application.findUniqueOrThrow({
      where: { id: input.applicationId },
      include: { site: true, family: true },
    });

    const familyMessage =
      input.toStatus === "ACCEPTED"
        ? input.familyMessage?.trim() || input.nextSteps?.trim() || null
        : input.familyMessage?.trim() || null;

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: input.expectedStatus,
        toStatus: input.toStatus,
        changedByUserId: input.userId,
        note: (input.internalNote || input.reopenReason || "").slice(0, 200) || null,
        internalNote: (input.internalNote || input.reopenReason || null)?.slice(0, 2000) || null,
        familyMessage: familyMessage?.slice(0, 2000) || null,
        requestedDocuments: input.requestedDocuments ?? undefined,
        waitlistPosition:
          input.toStatus === "WAITLISTED" ? input.waitlistPosition ?? null : null,
        nextSteps:
          input.toStatus === "ACCEPTED" ? input.nextSteps?.slice(0, 2000) || null : null,
        isReopen,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const email = applicationStatusEmail({
      publicRef: next.publicRef,
      toStatus: input.toStatus,
      locale,
      familyMessage,
      applicationId: next.id,
    });
    await enqueueOutbox(tx, {
      type: "application.status_changed",
      aggregateType: "Application",
      aggregateId: next.id,
      idempotencyKey: outboxKey,
      payload: {
        toUserId: next.family.ownerUserId,
        subject: email.subject,
        text: email.text,
        applicationId: next.id,
        publicRef: next.publicRef,
        locale,
      },
    });

    return next;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: isReopen ? "application.status_reopened" : "application.status_changed",
    entityType: "Application",
    entityId: input.applicationId,
    metadata: {
      from: input.expectedStatus,
      to: input.toStatus,
      version: input.expectedVersion + 1,
    },
    ipAddress: input.ipAddress,
  });

  // Fire-and-forget dispatch after commit (still idempotent via outbox key).
  void dispatchOutbox().catch(() => undefined);

  return prisma.application.findUniqueOrThrow({
    where: { id: updated.id },
    include: { site: true, family: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
}

/** @deprecated Prefer transitionApplicationStatus — kept as thin alias for older callers. */
export async function changeApplicationStatus(input: {
  userId: string;
  role: Role;
  applicationId: string;
  toStatus: ApplicationStatus;
  note?: string;
  ipAddress?: string | null;
}) {
  const current = await prisma.application.findUniqueOrThrow({
    where: { id: input.applicationId },
  });
  return transitionApplicationStatus({
    userId: input.userId,
    role: input.role,
    applicationId: input.applicationId,
    expectedStatus: current.status,
    expectedVersion: current.version,
    toStatus: input.toStatus,
    idempotencyKey: `legacy-${input.applicationId}-${input.toStatus}-${Date.now()}`,
    internalNote: input.note,
    familyMessage:
      input.toStatus === "REJECTED" || input.toStatus === "NEEDS_DOCUMENTS"
        ? input.note
        : null,
    requestedDocuments:
      input.toStatus === "NEEDS_DOCUMENTS" ? ["document"] : undefined,
    ipAddress: input.ipAddress,
  });
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
