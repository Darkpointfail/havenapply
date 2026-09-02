import { CaregiverRole, StaffOrgRole, type Role, type StaffPermission } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export async function listAccessibleFamilyIds(userId: string): Promise<string[]> {
  const rows = await prisma.caregiverMembership.findMany({
    where: { userId, acceptedAt: { not: null }, revokedAt: null },
    select: { familyProfileId: true },
  });
  return rows.map((r) => r.familyProfileId);
}

export async function assertCanAccessFamily(userId: string, familyProfileId: string, role?: Role) {
  if (role === "ADMIN") return;
  const membership = await prisma.caregiverMembership.findFirst({
    where: {
      userId,
      familyProfileId,
      acceptedAt: { not: null },
      revokedAt: null,
    },
  });
  if (!membership) throw new AuthzError("FAMILY_NOT_FOUND", 404);
}

/** OWNER/EDITOR may create, edit, submit, withdraw. VIEWER is read-only. */
export async function assertCanMutateFamily(
  userId: string,
  familyProfileId: string,
  role?: Role,
) {
  if (role === "ADMIN") return;
  const membership = await prisma.caregiverMembership.findFirst({
    where: {
      userId,
      familyProfileId,
      acceptedAt: { not: null },
      revokedAt: null,
      role: { in: [CaregiverRole.OWNER, CaregiverRole.EDITOR] },
    },
  });
  if (!membership) throw new AuthzError("FORBIDDEN", 403);
}

export async function listAccessibleSiteIds(userId: string): Promise<string[] | "ALL"> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return "ALL";

  const memberships = await prisma.staffMembership.findMany({
    where: { userId, revokedAt: null },
    include: { organization: { include: { sites: { select: { id: true } } } } },
  });

  const ids = new Set<string>();
  for (const m of memberships) {
    if (m.siteId) {
      ids.add(m.siteId);
    } else {
      for (const site of m.organization.sites) ids.add(site.id);
    }
  }
  return [...ids];
}

/**
 * Resolve staff membership for a destination site from the server-side application.siteId
 * (never trust client-supplied site/org ids).
 */
export async function getStaffMembershipForSite(userId: string, siteId: string) {
  const site = await prisma.residenceSite.findUnique({
    where: { id: siteId },
    select: { id: true, organizationId: true },
  });
  if (!site) return null;

  const memberships = await prisma.staffMembership.findMany({
    where: {
      userId,
      organizationId: site.organizationId,
      revokedAt: null,
      OR: [{ siteId: null }, { siteId: site.id }],
    },
  });
  if (memberships.length === 0) return null;

  return memberships.find((m) => m.siteId === site.id) ?? memberships[0]!;
}

export async function assertCanAccessApplication(
  userId: string,
  applicationId: string,
  role: Role,
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, familyProfileId: true, siteId: true, version: true, status: true },
  });
  if (!app) throw new AuthzError("APPLICATION_NOT_FOUND", 404);

  if (role === "ADMIN") return app;

  if (role === "FAMILY") {
    await assertCanAccessFamily(userId, app.familyProfileId, role);
    return app;
  }

  if (role === "STAFF") {
    const membership = await getStaffMembershipForSite(userId, app.siteId);
    if (!membership) throw new AuthzError("APPLICATION_NOT_FOUND", 404);
    return app;
  }

  throw new AuthzError("FORBIDDEN", 403);
}

/**
 * OWNER/EDITOR of the destination facility may change admissions status.
 * VIEWER may only consult. Never trust client siteId/organizationId.
 */
export async function assertCanMutateStaffApplication(userId: string, siteId: string) {
  const membership = await getStaffMembershipForSite(userId, siteId);
  if (!membership) throw new AuthzError("APPLICATION_NOT_FOUND", 404);
  if (
    membership.orgRole !== StaffOrgRole.OWNER &&
    membership.orgRole !== StaffOrgRole.EDITOR
  ) {
    throw new AuthzError("FORBIDDEN", 403);
  }
  return membership;
}

/** OWNER only for explicit reopen of ACCEPTED/REJECTED. */
export async function assertStaffOwnerForReopen(userId: string, siteId: string) {
  const membership = await assertCanMutateStaffApplication(userId, siteId);
  if (membership.orgRole !== StaffOrgRole.OWNER) {
    throw new AuthzError("FORBIDDEN", 403);
  }
  return membership;
}

export async function assertStaffPermission(
  userId: string,
  organizationId: string,
  permission: StaffPermission,
  siteId?: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return;

  const memberships = await prisma.staffMembership.findMany({
    where: {
      userId,
      organizationId,
      revokedAt: null,
      OR: [{ siteId: null }, ...(siteId ? [{ siteId }] : [])],
    },
    include: { permissions: true },
  });

  const ok = memberships.some((m) =>
    m.permissions.some((p) => p.permission === permission),
  );
  if (!ok) throw new AuthzError("FORBIDDEN", 403);
}

export async function assertCanAccessDocument(userId: string, documentId: string, role: Role) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      familyProfileId: true,
      applicationId: true,
      status: true,
      application: { select: { siteId: true } },
    },
  });
  if (!doc || doc.status === "DELETED") {
    throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
  }

  if (role === "ADMIN") return doc;

  if (role === "FAMILY") {
    await assertCanAccessFamily(userId, doc.familyProfileId, role);
    return doc;
  }

  if (role === "STAFF") {
    if (!doc.application?.siteId) throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
    if (doc.status !== "AVAILABLE") {
      throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
    }
    const membership = await getStaffMembershipForSite(userId, doc.application.siteId);
    if (!membership) throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
    return doc;
  }

  throw new AuthzError("FORBIDDEN", 403);
}
