import { NextRequest, NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_TTL_SECONDS,
  getSiteAccessPassword,
  mintSiteAccessCookieValue,
  normalizeSitePassword,
  passwordsMatch,
  siteAccessConfigured,
} from "@/lib/site-access";
import { isProductionRuntime } from "@/lib/security/env";
import { requestIsHttps } from "@/lib/security/tls";

export async function POST(request: NextRequest) {
  if (!siteAccessConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Site access is not configured" },
      { status: 503 },
    );
  }

  let expected: string;
  try {
    expected = getSiteAccessPassword();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Site access is not configured" },
      { status: 503 },
    );
  }

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Site access is not configured" },
      { status: 503 },
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
  if (!password || !passwordsMatch(password, expected)) {
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 },
    );
  }

  let cookieValue: string;
  try {
    cookieValue = await mintSiteAccessCookieValue();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Site access is not configured" },
      { status: 503 },
    );
  }

  const secure =
    isProductionRuntime() || requestIsHttps(request) || request.nextUrl.protocol === "https:";

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SITE_ACCESS_TTL_SECONDS,
  });
  return response;
}
