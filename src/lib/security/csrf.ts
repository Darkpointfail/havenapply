/**
 * CSRF protection for cookie-authenticated mutations.
 *
 * Two independent checks, both required on every non-GET request:
 *  1. Origin (or Referer) must match the request Host.
 *  2. Double submit: the `haven_csrf` cookie must equal the `x-haven-csrf`
 *     header. A cross-site page can send the cookie but cannot read it to set
 *     the header.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireSessionSecret } from "@/lib/security/env";

export const CSRF_COOKIE = "haven_csrf";
export const CSRF_HEADER = "x-haven-csrf";

/** Readable by the browser on purpose: the header must be set from JS. */
export function csrfCookieOptions(secure = true) {
  return {
    httpOnly: false,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

export function issueCsrfToken(): string {
  const nonce = randomBytes(24).toString("base64url");
  const mac = createHmac("sha256", requireSessionSecret()).update(nonce).digest("base64url");
  return `${nonce}.${mac}`;
}

function tokenIsWellFormed(token: string): boolean {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const nonce = token.slice(0, separator);
  const mac = token.slice(separator + 1);
  try {
    const provided = Buffer.from(mac);
    const expected = Buffer.from(
      createHmac("sha256", requireSessionSecret()).update(nonce).digest("base64url"),
    );
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type CsrfFailure = { ok: false; status: number; error: string };
export type CsrfResult = { ok: true } | CsrfFailure;

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * `cookieToken` is read by the caller (route handler) from the cookie jar so
 * this module stays free of Next request APIs and remains unit-testable.
 */
export function verifyCsrf(request: Request, cookieToken: string | undefined | null): CsrfResult {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return { ok: true };

  const host = request.headers.get("host");
  const originHost = hostOf(request.headers.get("origin"));
  const refererHost = hostOf(request.headers.get("referer"));
  const sourceHost = originHost ?? refererHost;

  if (!host || !sourceHost || sourceHost !== host) {
    return { ok: false, status: 403, error: "Cross-origin request rejected." };
  }

  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken || !cookieToken) {
    return { ok: false, status: 403, error: "Missing CSRF token." };
  }
  if (!safeEqual(headerToken, cookieToken) || !tokenIsWellFormed(headerToken)) {
    return { ok: false, status: 403, error: "Invalid CSRF token." };
  }

  return { ok: true };
}
