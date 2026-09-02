import type { Role, StaffPermission } from "@prisma/client";
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
    where: { userId, acceptedAt: { not: null } },
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
    },
  });
  if (!membership) throw new AuthzError("FAMILY_NOT_FOUND", 404);
}

export async function listAccessibleSiteIds(userId: string): Promise<string[] | "ALL"> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return "ALL";

  const memberships = await prisma.staffMembership.findMany({
    where: { userId },
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

export async function assertCanAccessApplication(
  userId: string,
  applicationId: string,
  role: Role,
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, familyProfileId: true, siteId: true },
  });
  if (!app) throw new AuthzError("APPLICATION_NOT_FOUND", 404);

  if (role === "ADMIN") return app;

  if (role === "FAMILY") {
    await assertCanAccessFamily(userId, app.familyProfileId, role);
    return app;
  }

  if (role === "STAFF") {
    const sites = await listAccessibleSiteIds(userId);
    if (sites !== "ALL" && !sites.includes(app.siteId)) {
      throw new AuthzError("APPLICATION_NOT_FOUND", 404);
    }
    return app;
  }

  throw new AuthzError("FORBIDDEN", 403);
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
      application: { select: { siteId: true } },
    },
  });
  if (!doc) throw new AuthzError("DOCUMENT_NOT_FOUND", 404);

  if (role === "ADMIN") return doc;

  if (role === "FAMILY") {
    await assertCanAccessFamily(userId, doc.familyProfileId, role);
    return doc;
  }

  if (role === "STAFF") {
    if (!doc.application?.siteId) throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
    const sites = await listAccessibleSiteIds(userId);
    if (sites !== "ALL" && !sites.includes(doc.application.siteId)) {
      throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
    }
    return doc;
  }

  throw new AuthzError("FORBIDDEN", 403);
}
