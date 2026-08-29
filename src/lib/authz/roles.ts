import type { UserRole } from "@/lib/auth-store";
import type { FamilyRole } from "@/lib/family-collaboration";
import type { CommunityTeamRole } from "@/lib/community-portal";
import type { AuthzRole } from "@/lib/authz/types";

/**
 * Map portal + household / team roles onto the canonical AuthzRole set.
 * Never accept AuthzRole strings from the browser — always derive server-side.
 */

export function mapFamilyCollaborationRole(role: FamilyRole): AuthzRole {
  switch (role) {
    case "owner":
      return "family_owner";
    case "editor":
    case "medical":
    case "financial":
      return "family_caregiver";
    case "viewer":
      return "family_viewer";
    default:
      return "family_viewer";
  }
}

/** Legal representative is an explicit elevated family role (not self-asserted). */
export function mapLegalRepresentative(): AuthzRole {
  return "family_legal_representative";
}

export function mapCommunityTeamRole(role: CommunityTeamRole): AuthzRole {
  switch (role) {
    case "admin":
      return "community_admin";
    case "admissions_manager":
    case "sales_counselor":
    case "nurse_reviewer":
      return "community_employee";
    case "readonly":
      return "community_employee";
    default:
      return "community_employee";
  }
}

/** SQL community_team_role → AuthzRole */
export function mapSqlCommunityRole(
  role: "org_admin" | "admissions_manager" | "admissions_staff" | "readonly",
): AuthzRole {
  if (role === "org_admin") return "community_admin";
  return "community_employee";
}

export function mapPlatformRole(
  role: "super_admin" | "ops" | "support" | "moderator",
): AuthzRole {
  if (role === "super_admin") return "haven_super_admin";
  return "haven_support";
}

export function mapPortalUserRole(role: UserRole): AuthzRole | null {
  if (role === "family") return "family_owner";
  if (role === "professional") return "family_caregiver";
  if (role === "facility" || role === "community") return "community_employee";
  if (role === "internal") return "haven_support";
  return null;
}

/** Roles that may never raise their own privilege. */
export const SELF_ROLE_CHANGE_FORBIDDEN: readonly AuthzRole[] = [
  "family_owner",
  "family_caregiver",
  "family_legal_representative",
  "family_viewer",
  "resident",
  "community_employee",
  "community_admin",
  "haven_support",
] as const;

export const FAMILY_ROLES: readonly AuthzRole[] = [
  "family_owner",
  "family_caregiver",
  "family_legal_representative",
  "family_viewer",
  "resident",
] as const;

export const COMMUNITY_ROLES: readonly AuthzRole[] = [
  "community_employee",
  "community_admin",
] as const;

export const PLATFORM_ROLES: readonly AuthzRole[] = [
  "haven_support",
  "haven_super_admin",
] as const;
