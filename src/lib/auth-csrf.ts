/**
 * CSRF defenses for cookie-authenticated mutating API routes.
 * Prefer SameSite cookies + Origin/Referer allowlist (OWASP).
 */

export function assertSameOriginMutation(request: Request): {
  ok: true;
} | { ok: false; status: 403; error: string } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host.toLowerCase());
  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).host.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  // Local dev conveniences
  allowedHosts.add("localhost:3000");
  allowedHosts.add("127.0.0.1:3000");

  const candidate = origin || referer;
  if (!candidate) {
    // Non-browser clients (curl) without Origin — deny state-changing browser-like cookies use.
    // Allow when explicitly marked as server/test via header that browsers cannot set cross-site.
    if (request.headers.get("x-haven-csrf") === process.env.CSRF_TEST_BYPASS) {
      return { ok: true };
    }
    return { ok: false, status: 403, error: "Missing Origin" };
  }

  try {
    const url = new URL(candidate);
    if (!allowedHosts.has(url.host.toLowerCase())) {
      return { ok: false, status: 403, error: "Invalid Origin" };
    }
  } catch {
    return { ok: false, status: 403, error: "Invalid Origin" };
  }

  return { ok: true };
}
