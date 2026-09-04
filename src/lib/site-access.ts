/** Soft site-wide password gate (staging / early access). */

import { siteAccessPassword, siteAccessSecret } from "@/lib/security/env";

export const SITE_ACCESS_COOKIE = "haven_site_access";

export const SITE_ACCESS_PATH = "/site-access";
export const SITE_ACCESS_API_PATH = "/api/site-access";

/** Reject absurd payloads before any comparison. */
export const SITE_ACCESS_PASSWORD_MAX_LENGTH = 128;

/**
 * The unlock cookie value is derived from the configured secret, so rotating
 * the secret invalidates every issued cookie. No literal is shipped in the
 * repository.
 */
export async function siteAccessCookieValue(): Promise<string | null> {
  const secret = siteAccessSecret();
  if (!secret) return null;
  // Web Crypto so the same helper works in the Edge middleware runtime.
  const data = new TextEncoder().encode(`site-access:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("base64url");
}

/** The gate is inert when no password is configured. */
export function siteAccessEnabled(): boolean {
  return siteAccessPassword() !== null;
}

export function configuredSitePassword(): string | null {
  return siteAccessPassword();
}

export function isSiteAccessPublicPath(pathname: string): boolean {
  return (
    pathname === SITE_ACCESS_PATH ||
    pathname === SITE_ACCESS_API_PATH ||
    pathname.startsWith(`${SITE_ACCESS_API_PATH}/`) ||
    pathname === "/media"
  );
}

/**
 * Normalize untrusted password input.
 * - Must be a string (blocks objects / arrays / prototype tricks)
 * - Trimmed, length-capped
 * - Never returned to the client or written into cookies/HTML
 */
export function normalizeSitePassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length > SITE_ACCESS_PASSWORD_MAX_LENGTH) return null;
  const password = raw.trim();
  if (!password || password.length > SITE_ACCESS_PASSWORD_MAX_LENGTH) return null;
  return password;
}

/** Constant-time compare so wrong guesses don't leak length/timing hints. */
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

/**
 * Allow only same-origin relative paths for post-login redirects.
 * Blocks protocol-relative URLs, schemes, and encoded tricks.
 */
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

  // Keep query/hash but reject nested protocol-relative hosts in them.
  if (candidate.includes("//")) return fallback;

  return candidate;
}
