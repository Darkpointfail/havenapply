/** Soft site-wide password gate (staging / early access). */

export const SITE_ACCESS_COOKIE = "haven_site_access";

/** Bump to invalidate existing unlock cookies when the password changes. */
export const SITE_ACCESS_COOKIE_VALUE = "gate-v1";

export const SITE_ACCESS_PASSWORD =
  process.env.SITE_ACCESS_PASSWORD || "HealthCare-Futur";

export const SITE_ACCESS_PATH = "/site-access";
export const SITE_ACCESS_API_PATH = "/api/site-access";

export function isSiteAccessPublicPath(pathname: string): boolean {
  return (
    pathname === SITE_ACCESS_PATH ||
    pathname === SITE_ACCESS_API_PATH ||
    pathname.startsWith(`${SITE_ACCESS_API_PATH}/`)
  );
}
