import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/auth-store";
import {
  FAMILY_SESSION_COOKIE,
  sessionUserFromPayload,
  usesLocalFamilySession,
  verifyFamilySessionToken,
} from "@/lib/family/session";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sessionFromSupabaseUser } from "@/lib/auth-supabase";

export type AuthzFailure = { ok: false; status: number; error: string };
export type AuthzOk = { ok: true; user: SessionUser };
export type AuthzResult = AuthzOk | AuthzFailure;

/**
 * Resolve the authenticated user for family APIs.
 * Never trusts body/query user ids — only session cookie or Supabase auth.
 */
export async function requireFamilyUser(): Promise<AuthzResult> {
  if (isSupabaseBackend()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { ok: false, status: 401, error: "Session expired. Please sign in again." };
      }
      const sessionUser = sessionFromSupabaseUser(user);
      if (!sessionUser) {
        return { ok: false, status: 403, error: "Access reserved for family accounts." };
      }
      if (sessionUser.role !== "family") {
        return { ok: false, status: 403, error: "Access reserved for family accounts." };
      }
      return { ok: true, user: sessionUser };
    } catch {
      return { ok: false, status: 401, error: "Session expired. Please sign in again." };
    }
  }

  if (!usesLocalFamilySession()) {
    return { ok: false, status: 503, error: "Authentication unavailable." };
  }

  const jar = await cookies();
  const token = jar.get(FAMILY_SESSION_COOKIE)?.value;
  const payload = verifyFamilySessionToken(token);
  if (!payload) {
    return { ok: false, status: 401, error: "Session expired. Please sign in again." };
  }
  if (payload.role !== "family") {
    return { ok: false, status: 403, error: "Access reserved for family accounts." };
  }
  return { ok: true, user: sessionUserFromPayload(payload) };
}

export function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
