import { cookies } from "next/headers";
import { jsonError, jsonOk } from "@/lib/family/authz";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { verifyCredentials } from "@/lib/security/auth-service";
import { SESSION_COOKIE, issueSession, sessionCookieOptions } from "@/lib/security/session";
import { CSRF_COOKIE, csrfCookieOptions, issueCsrfToken } from "@/lib/security/csrf";

/**
 * The only place a session is created in local mode.
 * Credentials are verified server-side; the cookie carries a session id bound
 * to a revocable server record.
 */
export async function POST(request: Request) {
  if (isSupabaseBackend()) {
    return jsonError("Use Supabase Auth on this deployment.", 400);
  }

  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { email?: unknown; password?: unknown; expectedRole?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const expectedRole =
    typeof body.expectedRole === "string" ? parseUserRole(body.expectedRole) : null;

  const result = await verifyCredentials({
    email: body.email,
    password: body.password,
    expectedRole: expectedRole ?? undefined,
    fingerprint: await requestFingerprint(),
  });
  if (!result.ok) return jsonError(result.error, result.status);

  const { token } = await issueSession({
    userId: result.data.userId,
    role: result.data.role,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  // Fresh CSRF token per session.
  jar.set(CSRF_COOKIE, issueCsrfToken(), csrfCookieOptions());

  return jsonOk({
    user: {
      id: result.data.userId,
      email: result.data.email,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      role: result.data.role,
    },
  });
}
