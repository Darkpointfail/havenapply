import { timingSafeEqual } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/family/authz";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { completePasswordReset, requestPasswordReset } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";

/**
 * Operator override for support cases where the reset mail cannot be
 * delivered. Requires the deployment bootstrap secret and is audited.
 */
function operatorTokenMatches(provided: string | null): boolean {
  const expected = process.env.HAVEN_BOOTSTRAP_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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
  const token =
    operator || process.env.NODE_ENV !== "production" ? result.data.token : undefined;
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
