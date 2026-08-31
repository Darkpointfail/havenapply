import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth-store";
import {
  FAMILY_SESSION_COOKIE,
  familySessionCookieOptions,
  mintFamilySessionToken,
} from "@/lib/family/session";
import { isSupabaseBackend } from "@/lib/supabase/config";

type Body = {
  user?: SessionUser;
};

/**
 * Mint or clear the httpOnly family session cookie used by /api/family/*.
 * Local backend only — Supabase uses its own auth cookies.
 */
export async function POST(request: Request) {
  if (isSupabaseBackend()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!body.user?.id || !body.user?.email || body.user.role !== "family") {
    return NextResponse.json({ ok: false, error: "Invalid family session." }, { status: 400 });
  }

  const token = mintFamilySessionToken(body.user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FAMILY_SESSION_COOKIE, token, familySessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FAMILY_SESSION_COOKIE, "", { ...familySessionCookieOptions(0), maxAge: 0 });
  return res;
}
