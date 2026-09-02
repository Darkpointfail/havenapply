import { ApplicationStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCanAccessApplication,
  assertCanAccessFamily,
  assertStaffPermission,
  listAccessibleFamilyIds,
  listAccessibleSiteIds,
  AuthzError,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

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
  if (role === "ADMIN") {
    return prisma.application.findMany({
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (role !== "STAFF") throw new AuthzError("FORBIDDEN", 403);
  const sites = await listAccessibleSiteIds(userId);
  if (sites === "ALL") {
    return prisma.application.findMany({
      include: { site: true, family: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  return prisma.application.findMany({
    where: { siteId: { in: sites } },
    include: { site: true, family: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApplicationForUser(
  userId: string,
  role: Role,
  applicationId: string,
) {
  await assertCanAccessApplication(userId, applicationId, role);
  return prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { site: true, family: true, statusHistory: true, documents: true },
  });
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
    // Families may only withdraw their own applications.
    if (input.toStatus !== "WITHDRAWN") throw new AuthzError("FORBIDDEN", 403);
    await assertCanAccessFamily(input.userId, app.familyProfileId, input.role);
  } else if (input.role !== "ADMIN") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const current = await prisma.application.findUniqueOrThrow({
    where: { id: input.applicationId },
  });

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

export async function createDraftApplication(input: {
  userId: string;
  role: Role;
  familyProfileId: string;
  siteId: string;
}) {
  await assertCanAccessFamily(input.userId, input.familyProfileId, input.role);
  const site = await prisma.residenceSite.findUnique({ where: { id: input.siteId } });
  if (!site) throw new AuthzError("SITE_NOT_FOUND", 404);

  return prisma.application.create({
    data: {
      familyProfileId: input.familyProfileId,
      siteId: input.siteId,
      status: "DRAFT",
      publicRef: `HA-${Date.now().toString(36).toUpperCase()}`,
      statusHistory: {
        create: {
          toStatus: "DRAFT",
          changedByUserId: input.userId,
          note: "Draft created",
        },
      },
    },
  });
}
