import type { SessionUser } from "@/lib/auth-store";

/**
 * Temporary: skip accounts and open family + community portals directly.
 * Flip to `false` when real auth should return.
 */
export const AUTH_OPEN_ACCESS = true;

export const DEMO_FAMILY_USER: SessionUser = {
  id: "demo_family",
  email: "demo.family@havenapply.local",
  firstName: "Alex",
  lastName: "Martin",
  name: "Alex Martin",
  role: "family",
  emailConfirmed: true,
  // False until the loved-one profile is finalized in onboarding/assistant.
  onboardingCompleted: false,
};

export const DEMO_COMMUNITY_USER: SessionUser = {
  id: "demo_community",
  email: "demo.admissions@havenapply.local",
  firstName: "Jordan",
  lastName: "Lee",
  name: "Jordan Lee",
  role: "community",
  organization: "Maple Grove Residence",
  jobTitle: "Director of Admissions",
  emailConfirmed: true,
  communityStatus: "verified",
  onboardingCompleted: true,
};

export const DEMO_PROFESSIONAL_USER: SessionUser = {
  id: "demo_professional",
  email: "demo.care@havenapply.local",
  firstName: "Sam",
  lastName: "Rivera",
  name: "Sam Rivera",
  role: "professional",
  organization: "City General Hospital",
  jobTitle: "Discharge Planner",
  emailConfirmed: true,
  onboardingCompleted: true,
};

const OPEN_FAMILY_KEY = "haven-open-family";
const OPEN_COMMUNITY_KEY = "haven-open-community";
const OPEN_PROFESSIONAL_KEY = "haven-open-professional";

function clearOtherOpenSessions(keep: "family" | "community" | "professional") {
  if (typeof window === "undefined") return;
  try {
    if (keep !== "family") sessionStorage.removeItem(OPEN_FAMILY_KEY);
    if (keep !== "community") sessionStorage.removeItem(OPEN_COMMUNITY_KEY);
    if (keep !== "professional") sessionStorage.removeItem(OPEN_PROFESSIONAL_KEY);
  } catch {
    /* ignore */
  }
}

export function markOpenFamilySession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OPEN_FAMILY_KEY, "1");
    clearOtherOpenSessions("family");
  } catch {
    /* ignore */
  }
}

export function markOpenCommunitySession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OPEN_COMMUNITY_KEY, "1");
    clearOtherOpenSessions("community");
  } catch {
    /* ignore */
  }
}

export function markOpenProfessionalSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OPEN_PROFESSIONAL_KEY, "1");
    clearOtherOpenSessions("professional");
  } catch {
    /* ignore */
  }
}

export function clearOpenAccessSessions() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OPEN_FAMILY_KEY);
    sessionStorage.removeItem(OPEN_COMMUNITY_KEY);
    sessionStorage.removeItem(OPEN_PROFESSIONAL_KEY);
  } catch {
    /* ignore */
  }
}

export function hasOpenFamilySession() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OPEN_FAMILY_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasOpenCommunitySession() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OPEN_COMMUNITY_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasOpenProfessionalSession() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OPEN_PROFESSIONAL_KEY) === "1";
  } catch {
    return false;
  }
}

/** Public browse list only (not a community profile). */
export function isPublicCommunityListPath(pathname: string) {
  const p = pathname.replace(/\/$/, "") || "/";
  return p === "/find-senior-living" || p === "/residences";
}

/** Community profile / establishment detail. */
export function isCommunityDetailPath(pathname: string) {
  return /^\/(find-senior-living|residences)\/[^/]+\/?$/.test(pathname);
}

/**
 * Shared browse surfaces used by Family and Care Professional
 * (search, profiles, compare, saved).
 */
export function isSharedBrowsePath(pathname: string) {
  return (
    pathname.startsWith("/find-senior-living") ||
    pathname.startsWith("/residences") ||
    pathname.startsWith("/compare") ||
    pathname.startsWith("/saved")
  );
}

/** @deprecated use isSharedBrowsePath — kept for existing imports */
export function isFamilyBrowsePath(pathname: string) {
  return isSharedBrowsePath(pathname);
}

/** Core family portal routes (not the public Find Senior Living list). */
export function isFamilyPortalPath(pathname: string) {
  return (
    pathname.startsWith("/family") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/assistant") ||
    pathname.startsWith("/start") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/apply") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/calendar")
  );
}

/** Apply flow — must not auto-open a demo session for anonymous visitors. */
export function isFamilyApplyPath(pathname: string) {
  return (
    pathname.startsWith("/family/apply") ||
    pathname === "/apply" ||
    pathname.startsWith("/apply/")
  );
}

/** Messaging a community — same rule as apply: account required first. */
export function isFamilyMessagesPath(pathname: string) {
  return (
    pathname.startsWith("/family/messages") ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  );
}

/**
 * Family actions that must never mint an anonymous demo session
 * (apply, message admissions, etc.).
 */
export function isFamilyAccountRequiredPath(pathname: string) {
  return isFamilyApplyPath(pathname) || isFamilyMessagesPath(pathname);
}

export function isCommunityPortalPath(pathname: string) {
  if (!pathname.startsWith("/community") && !pathname.startsWith("/admin")) return false;
  if (
    pathname === "/community/sign-in" ||
    pathname === "/community/get-started" ||
    pathname === "/community/pending"
  ) {
    return false;
  }
  return true;
}

export function isProfessionalPortalPath(pathname: string) {
  return (
    pathname.startsWith("/professional") ||
    pathname === "/hospital" ||
    pathname.startsWith("/hospital/")
  );
}

/** Demo session for the current path. Pass useStoredSession only after mount (client). */
export function demoUserForPath(
  pathname: string,
  options?: { useStoredSession?: boolean },
): SessionUser | null {
  if (!AUTH_OPEN_ACCESS) return null;

  // Apply / message require an existing family session — never auto-admit guests.
  if (isFamilyAccountRequiredPath(pathname)) {
    if (options?.useStoredSession && hasOpenFamilySession()) return DEMO_FAMILY_USER;
    return null;
  }

  if (isProfessionalPortalPath(pathname)) {
    return DEMO_PROFESSIONAL_USER;
  }
  if (isCommunityPortalPath(pathname)) {
    return DEMO_COMMUNITY_USER;
  }
  if (isFamilyPortalPath(pathname)) {
    return DEMO_FAMILY_USER;
  }
  // sessionStorage is client-only — never read during SSR / first paint
  if (options?.useStoredSession && isSharedBrowsePath(pathname)) {
    if (hasOpenProfessionalSession()) return DEMO_PROFESSIONAL_USER;
    if (hasOpenFamilySession()) return DEMO_FAMILY_USER;
  }
  return null;
}
