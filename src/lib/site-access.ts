/**
 * Site-wide soft gate — password from secrets manager / env only.
 * Unlock cookie is an HMAC-signed opaque token (rotatable via signing secrets).
 */

import { isProductionRuntime, optionalSecret, requireSecret } from "@/lib/security/env";
import { mintSignedToken, verifySignedToken } from "@/lib/security/signed-token";

export const SITE_ACCESS_COOKIE = "haven_site_access";
export const SITE_ACCESS_PATH = "/site-access";
export const SITE_ACCESS_API_PATH = "/api/site-access";
export const SITE_ACCESS_PASSWORD_MAX_LENGTH = 128;

/** Cookie / token type version — bump to force re-auth after policy changes. */
export const SITE_ACCESS_TOKEN_TYP = "site_access_v5";

/** Session unlock TTL (8 hours). */
export const SITE_ACCESS_TTL_SECONDS = 60 * 60 * 8;

export function getSiteAccessPassword(): string {
  // No hardcoded production password. Dev fallback only outside production.
  return requireSecret("SITE_ACCESS_PASSWORD", {
    devFallback: process.env.NODE_ENV === "test" ? "test-site-password" : "",
  });
}

export function getSiteAccessSigningSecret(): string {
  return requireSecret("SITE_ACCESS_SIGNING_SECRET", {
    devFallback: "dev-only-site-access-signing-secret-rotate-me",
  });
}

export function getSiteAccessSigningSecretPrevious(): string | undefined {
  return optionalSecret("SITE_ACCESS_SIGNING_SECRET_PREVIOUS");
}

export function isSiteAccessPublicPath(pathname: string): boolean {
  return (
    pathname === SITE_ACCESS_PATH ||
    pathname === SITE_ACCESS_API_PATH ||
    pathname.startsWith(`${SITE_ACCESS_API_PATH}/`)
  );
}

export function normalizeSitePassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length > SITE_ACCESS_PASSWORD_MAX_LENGTH) return null;
  const password = raw.trim();
  if (!password || password.length > SITE_ACCESS_PASSWORD_MAX_LENGTH) return null;
  return password;
}

/** Constant-time compare (encoding-length padded). */
export function passwordsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  const len = Math.max(a.length, b.length);
  const aPad = new Uint8Array(len);
  const bPad = new Uint8Array(len);
  aPad.set(a);
  bPad.set(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= aPad[i]! ^ bPad[i]!;
  }
  return diff === 0;
}

export async function mintSiteAccessCookieValue(): Promise<string> {
  return mintSignedToken(
    getSiteAccessSigningSecret(),
    SITE_ACCESS_TOKEN_TYP,
    { v: 5 },
    SITE_ACCESS_TTL_SECONDS,
  );
}

export async function isValidSiteAccessCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  // Reject legacy fixed cookie constants without verifying their content.
  if (!value.includes(".")) return false;
  try {
    const result = await verifySignedToken(
      getSiteAccessSigningSecret(),
      value,
      SITE_ACCESS_TOKEN_TYP,
      getSiteAccessSigningSecretPrevious(),
    );
    return result.ok;
  } catch {
    return false;
  }
}

/**
 * Production must configure SITE_ACCESS_PASSWORD. When unset outside production,
 * the gate is disabled (fail-open for local DX). Production fails closed.
 */
export function siteAccessConfigured(): boolean {
  if (isProductionRuntime()) {
    return Boolean(process.env.SITE_ACCESS_PASSWORD?.trim());
  }
  return Boolean(process.env.SITE_ACCESS_PASSWORD?.trim());
}

/** When true, middleware skips the password gate. */
export function siteAccessGateDisabled(): boolean {
  if (isProductionRuntime()) return false;
  return !process.env.SITE_ACCESS_PASSWORD?.trim();
}

export function safeSiteNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  let candidate = raw.trim();
  if (!candidate) return fallback;

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  if (candidate.includes("://") || candidate.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(candidate)) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate.slice(1))) return fallback;
  if (candidate.includes("//")) return fallback;

  return candidate;
}
