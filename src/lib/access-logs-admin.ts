import { createClient } from "@/lib/supabase/server";
import { adminTokensMatch } from "@/lib/site-access-log";

/**
 * Server-side gate for access-log admin APIs.
 * 1) Supabase session with internal / platform role, or
 * 2) Bearer token matching ACCESS_LOGS_ADMIN_TOKEN (ops fallback).
 * Never trust client-supplied "I am admin" flags alone.
 */
export async function requireAccessLogsAdmin(
  request: Request,
): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const expected = process.env.ACCESS_LOGS_ADMIN_TOKEN?.trim();
  if (bearer && expected && adminTokensMatch(bearer, expected)) {
    return { ok: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, status: 401 };

    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const role = typeof meta.role === "string" ? meta.role : "";
    if (role === "internal") return { ok: true };

    // Optional platform_roles check when table exists
    const { data: platform } = await supabase
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);
    if (platform && platform.length > 0) return { ok: true };

    return { ok: false, status: 403 };
  } catch {
    if (expected) return { ok: false, status: 401 };
    return { ok: false, status: 401 };
  }
}
