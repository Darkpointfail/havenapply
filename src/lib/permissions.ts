/**
 * Single source of truth for role permissions and route access.
 * Shared browse surfaces (community profiles) are allowed for Family and Care Professional.
 * Portal dashboards remain role-exclusive.
 */

import {
  isFacilityRole,
  type SessionUser,
  type UserRole,
} from "@/lib/auth-store";

/** Normalize aliases so facility/community are treated as the same portal role. */
export function canonicalPortalRole(role: UserRole): UserRole {
  if (role === "facility") return "community";
  return role;
}

/** True when the signed-in user satisfies a RequireAuth role requirement. */
export function roleSatisfies(userRole: UserRole, required: UserRole): boolean {
  if (userRole === required) return true;
  if (isFacilityRole(userRole) && isFacilityRole(required)) return true;
  return false;
}

export function isFamilyRole(role: UserRole) {
  return role === "family";
}

export function isProfessionalRole(role: UserRole) {
  return role === "professional";
}

/** Family + Care Professional may browse/view community profiles. Guests may view too. */
export function canViewCommunityProfiles(user: SessionUser | null | undefined): boolean {
  if (!user) return true;
  return isFamilyRole(user.role) || isProfessionalRole(user.role);
}

/** Family-only dossier apply flow on community detail pages. */
export function canUseFamilyApplyFlow(user: SessionUser | null | undefined): boolean {
  return Boolean(user && isFamilyRole(user.role));
}

/** Care professionals may apply from their own caseload tools. */
export function canUseProfessionalApplyFlow(user: SessionUser | null | undefined): boolean {
  return Boolean(user && isProfessionalRole(user.role));
}

/** True when the user may start an application (must be signed in as family or professional). */
export function canStartApplication(user: SessionUser | null | undefined): boolean {
  return canUseFamilyApplyFlow(user) || canUseProfessionalApplyFlow(user);
}

/** Family and care professionals may message communities; guests cannot. */
export function canMessageCommunity(user: SessionUser | null | undefined): boolean {
  return canStartApplication(user);
}

export function applySignInHref(residenceId?: string): string {
  const next = residenceId ? `/family/apply/${residenceId}` : "/";
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

export function messageSignInHref(residenceId?: string): string {
  const next = residenceId
    ? `/family/messages?community=${encodeURIComponent(residenceId)}`
    : "/family/messages";
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

export function canAccessFamilyPortal(user: SessionUser | null | undefined): boolean {
  return Boolean(user && isFamilyRole(user.role));
}

export function canAccessProfessionalPortal(user: SessionUser | null | undefined): boolean {
  return Boolean(user && isProfessionalRole(user.role));
}

export function canAccessCommunityPortal(
  user: SessionUser | null | undefined,
  options?: { requireVerified?: boolean },
): boolean {
  if (!user || !isFacilityRole(user.role)) return false;
  if (options?.requireVerified === false) return true;
  return user.communityStatus === "verified";
}

export function canAccessInternalPortal(user: SessionUser | null | undefined): boolean {
  return Boolean(user && user.role === "internal");
}

export function signInPathForRole(role: UserRole): string {
  if (isFacilityRole(role)) return "/community/sign-in";
  if (role === "internal") return "/internal/sign-in";
  return "/sign-in";
}

export function openAccessHomeForPath(pathname: string): string {
  if (pathname.startsWith("/professional")) return "/professional/dashboard";
  if (pathname.startsWith("/community")) return "/community/dashboard";
  return "/";
}

/** Shared compare URL (not under /family, so Care Professionals can open it). */
export function compareCommunitiesHref(ids: string[] = []): string {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 4);
  return unique.length ? `/compare?ids=${unique.join(",")}` : "/compare";
}

export function savedCommunitiesHref(): string {
  return "/saved";
}

export function applicationsHrefForUser(user: SessionUser | null | undefined): string {
  if (user?.role === "professional") return "/professional/applications";
  return "/family/applications";
}
