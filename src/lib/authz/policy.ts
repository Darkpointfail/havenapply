import { COMMUNITY_ROLES, FAMILY_ROLES, SELF_ROLE_CHANGE_FORBIDDEN } from "@/lib/authz/roles";
import {
  actorMayAccessCommunityTenant,
  actorMayAccessFamilyTenant,
  allow,
  deny,
  denyNotFound,
  isAccountUsable,
  isSupportGrantValid,
  supportGrantCoversResource,
} from "@/lib/authz/tenant";
import type {
  AuthzAction,
  AuthzActor,
  AuthzDecision,
  AuthzResource,
} from "@/lib/authz/types";

export type AuthorizeInput = {
  actor: AuthzActor | null;
  action: AuthzAction;
  resource: AuthzResource;
  now?: Date;
};

/**
 * Server-authoritative authorization decision.
 * Callers must build `actor` from verified session + DB membership — never from request body alone.
 */
export function authorize(input: AuthorizeInput): AuthzDecision {
  const { action, resource } = input;
  const now = input.now ?? new Date();
  const actor = input.actor;

  if (!actor) {
    return deny("deny_unauthenticated", "Authentication required", 401);
  }

  if (!isAccountUsable(actor)) {
    return deny("deny_disabled", "Account is disabled or suspended", 403);
  }

  if (resource.exists === false) {
    return denyNotFound();
  }

  if (action === "change_own_role") {
    if (SELF_ROLE_CHANGE_FORBIDDEN.includes(actor.role)) {
      return deny(
        "deny_self_role_change",
        "Users cannot elevate or change their own role",
        403,
      );
    }
  }

  if (actor.role === "haven_super_admin") {
    return allow("super-admin");
  }

  if (actor.role === "haven_support") {
    return authorizeSupport(actor, action, resource, now);
  }

  if (FAMILY_ROLES.includes(actor.role)) {
    return authorizeFamily(actor, action, resource);
  }

  if (COMMUNITY_ROLES.includes(actor.role)) {
    return authorizeCommunity(actor, action, resource);
  }

  return deny("deny_role", "No matching role policy", 403);
}

function authorizeSupport(
  actor: AuthzActor,
  action: AuthzAction,
  resource: AuthzResource,
  now: Date,
): AuthzDecision {
  if (action === "support_break_glass") {
    return deny("deny_role", "Support cannot self-issue break-glass grants", 403);
  }

  const grant = actor.supportGrant;
  if (!isSupportGrantValid(grant, now) || !grant) {
    return deny(
      "deny_support_no_grant",
      "Support access requires an active, justified, time-limited grant",
      403,
    );
  }

  if (!supportGrantCoversResource(grant, resource)) {
    return denyNotFound("Support grant does not cover this tenant");
  }

  if (action === "read" || action === "export_data" || action === "add_internal_notes") {
    return allow("support break-glass grant");
  }

  return deny("deny_role", "Support grant is read-focused; mutation denied", 403);
}

function authorizeFamily(
  actor: AuthzActor,
  action: AuthzAction,
  resource: AuthzResource,
): AuthzDecision {
  const familyOk = actorMayAccessFamilyTenant(actor, resource.familyId);

  switch (resource.type) {
    case "family":
    case "senior_dossier":
    case "document":
    case "message":
    case "application": {
      if (!familyOk) return denyNotFound();
      return familyActionAllowed(actor, action);
    }
    case "community_workspace":
      return denyNotFound();
    case "platform_user":
      if (resource.id === actor.userId && (action === "read" || action === "update")) {
        return allow("self profile");
      }
      return deny("deny_role", "Cannot manage other platform users", 403);
    default:
      return deny("deny_role", "Unsupported resource for family role", 403);
  }
}

function familyActionAllowed(actor: AuthzActor, action: AuthzAction): AuthzDecision {
  if (actor.role === "resident") {
    if (action === "read") return allow("resident read");
    return deny("deny_role", "Resident role is read-limited", 403);
  }

  if (actor.role === "family_viewer") {
    if (action === "read") return allow("viewer read");
    return deny("deny_role", "Viewer cannot mutate", 403);
  }

  if (action === "manage_team" || action === "revoke_access" || action === "change_member_role") {
    if (actor.role === "family_owner" || actor.role === "family_legal_representative") {
      return allow("family admin");
    }
    return deny("deny_role", "Only owner or legal representative can manage members", 403);
  }

  if (action === "submit_application" || action === "withdraw_application" || action === "share") {
    if (
      actor.role === "family_owner" ||
      actor.role === "family_caregiver" ||
      actor.role === "family_legal_representative"
    ) {
      return allow("family submit");
    }
    return deny("deny_role", "Role cannot submit or share", 403);
  }

  if (
    action === "read" ||
    action === "create" ||
    action === "update" ||
    action === "delete" ||
    action === "export_data" ||
    action === "invite_member"
  ) {
    return allow("family member");
  }

  if (action === "change_own_role") {
    return deny("deny_self_role_change", "Cannot change own role", 403);
  }

  return deny("deny_role", "Action not permitted for family role", 403);
}

function authorizeCommunity(
  actor: AuthzActor,
  action: AuthzAction,
  resource: AuthzResource,
): AuthzDecision {
  const communityOk = actorMayAccessCommunityTenant(
    actor,
    resource.communityId,
    resource.organizationId,
  );

  switch (resource.type) {
    case "community_workspace":
    case "application":
    case "document":
    case "message": {
      if (!communityOk) return denyNotFound();
      return communityActionAllowed(actor, action);
    }
    case "senior_dossier":
    case "family": {
      // Staff never get cross-family PHI unless tied to an application in their tenant.
      // Direct family/senior access without community scope is denied.
      if (!communityOk || !resource.communityId) return denyNotFound();
      if (action === "read") return allow("packet-scoped read");
      return deny("deny_role", "Staff cannot mutate family master records", 403);
    }
    case "platform_user":
      if (resource.id === actor.userId && action === "read") return allow("self");
      if (action === "change_own_role" || action === "change_member_role") {
        if (action === "change_own_role") {
          return deny("deny_self_role_change", "Staff cannot change their own role", 403);
        }
        if (actor.role === "community_admin" && communityOk) return allow("admin manages team");
        return deny("deny_role", "Only community admin can change member roles", 403);
      }
      return deny("deny_role", "Denied", 403);
    default:
      return deny("deny_role", "Unsupported resource for community role", 403);
  }
}

function communityActionAllowed(actor: AuthzActor, action: AuthzAction): AuthzDecision {
  if (action === "change_own_role") {
    return deny("deny_self_role_change", "Cannot change own role", 403);
  }

  if (action === "read") return allow("community read");

  if (action === "add_internal_notes" || action === "request_documents") {
    return allow("community employee");
  }

  if (
    action === "accept_application" ||
    action === "decline_application" ||
    action === "manage_team" ||
    action === "invite_member" ||
    action === "revoke_access" ||
    action === "change_member_role"
  ) {
    if (actor.role === "community_admin") return allow("community admin");
    return deny("deny_role", "Requires community admin", 403);
  }

  if (action === "update" || action === "create") {
    return allow("community update");
  }

  if (action === "export_data") {
    if (actor.role === "community_admin") return allow("admin export");
    return deny("deny_role", "Export limited to community admin", 403);
  }

  return deny("deny_role", "Action not permitted for community role", 403);
}

/**
 * Helper for APIs: map decision to a stable client payload (no sensitive detail leakage).
 */
export function toAuthzResponse(decision: AuthzDecision): {
  ok: boolean;
  code: AuthzDecision["code"];
  status: AuthzDecision["httpStatus"];
} {
  return {
    ok: decision.allowed,
    code: decision.code,
    status: decision.httpStatus,
  };
}
