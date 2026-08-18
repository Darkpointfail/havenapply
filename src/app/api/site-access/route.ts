import { NextResponse } from "next/server";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { assertSameOriginMutation } from "@/lib/auth-csrf";
import { secureCookieOptions } from "@/lib/auth-cookies";
import { recordAuthEvent } from "@/lib/auth-events-server";
import { clientKeyFromRequest, rateLimit } from "@/lib/auth-rate-limit";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_VALUE,
  SITE_ACCESS_PASSWORD,
  normalizeSitePassword,
  passwordsMatch,
} from "@/lib/site-access";

export async function POST(request: Request) {
  const csrf = assertSameOriginMutation(request);
  if (!csrf.ok) {
    void recordAuthEvent({ type: "csrf_rejected", detail: "site-access" });
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.generic }, { status: csrf.status });
  }

  const limited = rateLimit({
    key: clientKeyFromRequest(request, "site-access"),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    void recordAuthEvent({ type: "rate_limited", detail: "site-access" });
    return NextResponse.json(
      { ok: false, error: AUTH_MESSAGES.rateLimited },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let rawPassword: unknown = "";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: unknown;
    } | null;
    rawPassword = body?.password;
  } else {
    const form = await request.formData().catch(() => null);
    rawPassword = form?.get("password");
  }

  const password = normalizeSitePassword(rawPassword);
  if (!password || !passwordsMatch(password, SITE_ACCESS_PASSWORD)) {
    // Static error only — never echo the submitted or expected password.
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: SITE_ACCESS_COOKIE_VALUE,
    ...secureCookieOptions(),
  });
  return response;
}
