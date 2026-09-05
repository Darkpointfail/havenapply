import { jsonError, jsonOk } from "@/lib/family/authz";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { enforceRateLimit, registerAccount } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { recordAuditEvent } from "@/lib/security/identity-repository";
import { createClient } from "@/lib/supabase/server";

/**
 * Registration against Supabase Auth.
 *
 * Nothing here decides a role. The database trigger gives every new account
 * `family`, and the only ways out of it are accepting an invitation or an
 * operator grant — so a crafted sign-up payload cannot ask for more.
 */
async function registerWithSupabase(request: Request, body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter an email address and a password.", 400);

  const throttled = await enforceRateLimit("signUp", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: typeof body.firstName === "string" ? body.firstName.trim() : "",
        last_name: typeof body.lastName === "string" ? body.lastName.trim() : "",
      },
    },
  });

  if (error || !data.user) {
    await recordAuditEvent({
      event: "auth.register",
      outcome: "failure",
      subject: email,
      metadata: { backend: "supabase" },
    });
    // Deliberately vague: whether an address already has an account is not
    // something an unauthenticated caller gets to enumerate.
    return jsonError("Could not create the account.", 400);
  }

  await recordAuditEvent({
    event: "auth.register",
    outcome: "success",
    actorId: data.user.id,
    metadata: { backend: "supabase" },
  });

  return jsonOk(
    { userId: data.user.id, pendingConfirmation: !data.session },
    201,
  );
}

/**
 * Local-mode registration. Staff and admin accounts are never self-served:
 * they come from an invitation, so only `family` may register here.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const role = typeof body.role === "string" ? parseUserRole(body.role) : "family";
  if (role !== "family") {
    return jsonError("Residence and admin accounts are created by invitation.", 403);
  }

  if (isSupabaseBackend()) {
    return registerWithSupabase(request, body);
  }

  const result = await registerAccount({
    email: body.email,
    password: body.password,
    role: "family",
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    fingerprint: await requestFingerprint(),
  });
  if (!result.ok) return jsonError(result.error, result.status);

  // The token belongs in the confirmation mail. Until a transport exists an
  // operator can read it back through /api/auth/verify-email.
  return jsonOk({ userId: result.data.userId }, 201);
}
