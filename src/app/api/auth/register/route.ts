import { jsonError, jsonOk } from "@/lib/family/authz";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { registerAccount } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";

/**
 * Local-mode registration. Staff and admin accounts are never self-served:
 * they come from an invitation, so only `family` may register here.
 */
export async function POST(request: Request) {
  if (isSupabaseBackend()) {
    return jsonError("Use Supabase Auth on this deployment.", 400);
  }

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
