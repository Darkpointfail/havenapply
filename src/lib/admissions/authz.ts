/**
 * Admissions actors, resolved from the central server guards.
 *
 * No request field may widen scope: the owning family comes from the session,
 * and the readable sites come from the membership table.
 */

import {
  requireFamily,
  requireStaff,
  scopeToSite,
  type GuardFailure,
  type StaffPrincipal,
} from "@/lib/security/guards";

export type FamilyActor = {
  userId: string;
  email: string;
  displayName: string;
};

export type StaffActor = {
  userId: string;
  email: string;
  displayName: string;
  siteIds: string[];
  memberships: StaffPrincipal["memberships"];
};

export type ActorResult<T> = { ok: true; actor: T } | GuardFailure;

export async function requireFamilyActor(): Promise<ActorResult<FamilyActor>> {
  const guard = await requireFamily();
  if (!guard.ok) return guard;
  return {
    ok: true,
    actor: {
      userId: guard.principal.userId,
      email: guard.principal.email,
      displayName: guard.principal.displayName,
    },
  };
}

export async function requireStaffActor(): Promise<ActorResult<StaffActor>> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;
  return {
    ok: true,
    actor: {
      userId: guard.principal.userId,
      email: guard.principal.email,
      displayName: guard.principal.displayName,
      siteIds: guard.principal.siteIds,
      memberships: guard.principal.memberships,
    },
  };
}

export function resolveStaffSiteScope(
  actor: StaffActor,
  requestedSiteId: string | null,
): { ok: true; siteIds: string[] } | GuardFailure {
  return scopeToSite(
    { ...actor, role: "facility", sessionId: null } as StaffPrincipal,
    requestedSiteId,
  );
}
