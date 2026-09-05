import { cookies } from "next/headers";
import { jsonError, jsonOk } from "@/lib/family/authz";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { enforceRateLimit, verifyCredentials } from "@/lib/security/auth-service";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionIdentity } from "@/lib/security/identity-supabase";
import { recordAuditEvent } from "@/lib/security/identity-repository";
import { SESSION_COOKIE, issueSession, sessionCookieOptions } from "@/lib/security/session";
import { CSRF_COOKIE, csrfCookieOptions, issueCsrfToken } from "@/lib/security/csrf";
import { isSecureRequest } from "@/lib/security/request-security";

/**
 * Sign in against Supabase Auth, from the server.
 *
 * Doing it here rather than in the browser is what makes the session cookie
 * HttpOnly: the token never becomes readable by page scripts. The role in the
 * response is read from the identity table, so it is the same value every guard
 * will use, and not whatever the account's metadata happens to say.
 */
async function signInWithSupabase(
  request: Request,
  body: { email?: unknown; password?: unknown },
) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter your email and password.", 400);

  const throttled = await enforceRateLimit("signIn", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      metadata: { backend: "supabase" },
    });
    return jsonError("Incorrect email or password.", 401);
  }

  const identity = await resolveSessionIdentity(supabase);
  if (!identity) {
    // Authenticated with Supabase but unknown to the application. Refuse rather
    // than invent a role.
    await supabase.auth.signOut();
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      actorId: data.user.id,
      metadata: { reason: "no_application_identity" },
    });
    return jsonError("This account is not provisioned for HavenApply.", 403);
  }

  const jar = await cookies();
  jar.set(CSRF_COOKIE, issueCsrfToken(), csrfCookieOptions(isSecureRequest(request)));

  await recordAuditEvent({
    event: "auth.sign_in",
    outcome: "success",
    actorId: identity.userId,
    metadata: { backend: "supabase" },
  });

  return jsonOk({
    user: { id: identity.userId, email: data.user.email ?? email, role: identity.appRole },
  });
}

/**
 * The only place a session is created in local mode.
 * Credentials are verified server-side; the cookie carries a session id bound
 * to a revocable server record.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { email?: unknown; password?: unknown; expectedRole?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (isSupabaseBackend()) {
    return signInWithSupabase(request, body);
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

  const secure = isSecureRequest(request);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(undefined, secure));
  // Fresh CSRF token per session.
  jar.set(CSRF_COOKIE, issueCsrfToken(), csrfCookieOptions(secure));

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
