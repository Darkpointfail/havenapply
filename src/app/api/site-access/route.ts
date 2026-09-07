import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  configuredSitePassword,
  normalizeSitePassword,
  passwordsMatch,
  siteAccessCookieValue,
} from "@/lib/site-access";
import { enforceRateLimit } from "@/lib/security/auth-service";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { requestFingerprint } from "@/lib/security/guards";

export async function POST(request: Request) {
  const expectedPassword = configuredSitePassword();
  if (!expectedPassword) {
    return NextResponse.json({ ok: false, error: "Gate disabled" }, { status: 404 });
  }

  const fingerprint = await requestFingerprint();
  const throttled = await enforceRateLimit("signIn", `site-access:${fingerprint}`);
  if (throttled) {
    return NextResponse.json({ ok: false, error: throttled.error }, { status: throttled.status });
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
  if (!password || !passwordsMatch(password, expectedPassword)) {
    await recordAuditEvent({
      event: "site_access.attempt",
      outcome: "failure",
      metadata: {},
    });
    // Static error only — never echo the submitted password.
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const value = await siteAccessCookieValue();
  if (!value) {
    return NextResponse.json({ ok: false, error: "Gate misconfigured" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    // Derived from the configured secret, never from user input.
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Session cookie only: password is required again on every new browser session.
  });
  await recordAuditEvent({ event: "site_access.attempt", outcome: "success", metadata: {} });
  return response;
}
