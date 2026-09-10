import { jsonError, jsonOk } from "@/lib/family/authz";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { completePasswordReset, requestPasswordReset } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { operatorTokenMatches } from "@/lib/security/operator";
import { passwordResetEmail, sendEmail } from "@/lib/email/mailer";

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

  // A token means a real account exists for this address — email the reset
  // link to it. (No token means either an invalid address or an unknown
  // account; either way there is nothing to send, and the response below
  // stays the same either way so accounts can't be enumerated.)
  if (result.data.token && typeof body.email === "string") {
    await sendEmail(passwordResetEmail(body.email, result.data.token));
  }

  const operator = operatorTokenMatches(request.headers.get("x-haven-bootstrap-token"));
  if (operator) {
    await recordAuditEvent({
      event: "auth.reset_request",
      outcome: "success",
      metadata: { via: "operator" },
    });
  }
  // The operator override exists for support cases where the mail can't be
  // delivered (e.g. no transport configured yet, or a bounce) — it lets a
  // support agent read the token back with the deployment bootstrap secret.
  // It is not how a real user gets their link; that always goes by email.
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
