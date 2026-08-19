import { NextResponse, type NextRequest } from "next/server";
import { mustEnforceTls } from "@/lib/security/env";

/** Resolve request scheme behind common reverse proxies (Vercel, etc.). */
export function requestIsHttps(request: NextRequest): boolean {
  const xf = request.headers.get("x-forwarded-proto");
  if (xf) {
    const first = xf.split(",")[0]?.trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
  }
  return request.nextUrl.protocol === "https:";
}

/**
 * In production, redirect cleartext to HTTPS (or 400 if redirect disabled).
 * Returns null when the request may proceed.
 */
export function enforceHttpsOrRedirect(request: NextRequest): NextResponse | null {
  if (!mustEnforceTls()) return null;
  if (requestIsHttps(request)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  // Prefer host from forwarded headers when present.
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) url.host = host;

  return NextResponse.redirect(url, 308);
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
