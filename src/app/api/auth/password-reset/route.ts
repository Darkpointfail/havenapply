import { jsonError, jsonOk } from "@/lib/family/authz";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { completePasswordReset, requestPasswordReset } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { operatorTokenMatches } from "@/lib/security/operator";

/**
 * Operator override for support cases where the reset mail cannot be
 * delivered. Requires the deployment bootstrap secret and is audited.
 */

/** Request a reset link. Always answers 200 so accounts cannot be enumerated. */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const result = await requestPasswordReset(body.email, await requestFingerprint());
  if (!result.ok) return jsonError(result.error, result.status);

  const operator = operatorTokenMatches(request.headers.get("x-haven-bootstrap-token"));
  if (operator) {
    await recordAuditEvent({
      event: "auth.reset_request",
      outcome: "success",
      metadata: { via: "operator" },
    });
  }
  // Only an operator ever reads the token back; a non-production flag is not a
  // trust boundary on a shared preview host.
  const token = operator ? result.data.token : undefined;
  return jsonOk({ sent: true, resetToken: token });
}

/** Consume the reset token: single use, expiring, revokes all sessions. */
export async function PUT(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { token?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const result = await completePasswordReset({
    token: body.token,
    password: body.password,
    fingerprint: await requestFingerprint(),
  });
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ reset: true });
}
