import type {
  AuthzActor,
  AuthzDecision,
  AuthzResource,
  InvitationRecord,
  SupportAccessGrant,
} from "@/lib/authz/types";

export function isAccountUsable(actor: AuthzActor): boolean {
  return actor.accountStatus === "active";
}

export function isSupportGrantValid(
  grant: SupportAccessGrant | null | undefined,
  now = new Date(),
): boolean {
  if (!grant) return false;
  if (grant.revokedAt) return false;
  if (!grant.justification.trim()) return false;
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) return false;
  return true;
}

/** Active grant must target the tenant of the resource being accessed. */
export function supportGrantCoversResource(
  grant: SupportAccessGrant,
  resource: AuthzResource,
): boolean {
  if (resource.type === "family" || resource.type === "senior_dossier" || resource.type === "document") {
    return Boolean(resource.familyId && grant.targetTenantId === resource.familyId);
  }
  if (resource.type === "application" || resource.type === "community_workspace") {
    return Boolean(
      (resource.communityId && grant.targetTenantId === resource.communityId) ||
        (resource.familyId && grant.targetTenantId === resource.familyId),
    );
  }
  if (resource.type === "platform_user") {
    return grant.targetTenantId === resource.id;
  }
  return grant.targetTenantId === resource.id;
}

export function isInvitationAcceptable(inv: InvitationRecord, now = new Date()): boolean {
  if (inv.status === "revoked" || inv.status === "expired" || inv.status === "accepted") {
    return false;
  }
  if (inv.status !== "pending") return false;
  return new Date(inv.expiresAt).getTime() > now.getTime();
}

/**
 * Tenant isolation: community staff only see their site (or org-wide sites).
 * Never trust communityId from the request body — pass membership-verified actor fields.
 */
export function actorMayAccessCommunityTenant(
  actor: AuthzActor,
  resourceCommunityId: string | null | undefined,
  resourceOrganizationId?: string | null,
): boolean {
  if (!resourceCommunityId) return false;
  if (actor.role === "haven_super_admin") return true;
  if (actor.role === "haven_support") return false; // requires grant path
  if (actor.role !== "community_admin" && actor.role !== "community_employee") return false;

  if (actor.communityId && actor.communityId === resourceCommunityId) return true;

  if (
    actor.orgWide &&
    actor.organizationId &&
    resourceOrganizationId &&
    actor.organizationId === resourceOrganizationId
  ) {
    return true;
  }

  return false;
}

export function actorMayAccessFamilyTenant(
  actor: AuthzActor,
  resourceFamilyId: string | null | undefined,
): boolean {
  if (!resourceFamilyId) return false;
  if (actor.role === "haven_super_admin") return true;
  if (
    actor.role === "family_owner" ||
    actor.role === "family_caregiver" ||
    actor.role === "family_legal_representative" ||
    actor.role === "family_viewer" ||
    actor.role === "resident"
  ) {
    return actor.familyId === resourceFamilyId;
  }
  return false;
}

export function deny(
  code: AuthzDecision["code"],
  reason: string,
  httpStatus: AuthzDecision["httpStatus"] = 403,
): AuthzDecision {
  return { allowed: false, code, reason, httpStatus };
}

export function allow(reason = "authorized"): AuthzDecision {
  return { allowed: true, code: "allow", reason, httpStatus: 200 };
}

/**
 * IDOR-safe denial: resource missing or cross-tenant → 404 (do not confirm existence).
 */
export function denyNotFound(reason = "Resource not found"): AuthzDecision {
  return deny("deny_not_found", reason, 404);
}
