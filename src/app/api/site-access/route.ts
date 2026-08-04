import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_VALUE,
  SITE_ACCESS_PASSWORD,
} from "@/lib/site-access";

export async function POST(request: Request) {
  let password = "";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: string;
    } | null;
    password = body?.password?.trim() || "";
  } else {
    const form = await request.formData().catch(() => null);
    password = String(form?.get("password") || "").trim();
  }

  if (password !== SITE_ACCESS_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: SITE_ACCESS_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
