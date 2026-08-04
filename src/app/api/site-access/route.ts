import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_VALUE,
  SITE_ACCESS_PASSWORD,
  normalizeSitePassword,
  passwordsMatch,
} from "@/lib/site-access";

export async function POST(request: Request) {
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
    // Static error only — never echo the submitted password.
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    // Fixed constant — never derived from user input.
    value: SITE_ACCESS_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
