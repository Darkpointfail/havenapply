import { timingSafeEqual } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/family/authz";
import { verifyEmailToken } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import {
  findCredentialByEmail,
  recordAuditEvent,
  updateCredential,
} from "@/lib/security/identity-store";

/**
 * Operator override, for support cases where the confirmation mail cannot be
 * delivered. Requires the deployment bootstrap secret, is audited, and is
 * unavailable unless `HAVEN_BOOTSTRAP_TOKEN` is configured.
 */
function operatorTokenMatches(provided: string | null): boolean {
  const expected = process.env.HAVEN_BOOTSTRAP_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { token?: unknown; email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (typeof body.email === "string" && operatorTokenMatches(request.headers.get("x-haven-bootstrap-token"))) {
    const credential = await findCredentialByEmail(body.email);
    if (!credential) return jsonError("No account for this address.", 404);
    await updateCredential(credential.userId, {
      emailVerifiedAt: new Date().toISOString(),
      verificationTokenHash: null,
      verificationExpiresAt: null,
    });
    await recordAuditEvent({
      event: "auth.email_verify",
      outcome: "success",
      actorId: credential.userId,
      subject: credential.email,
      metadata: { via: "operator" },
    });
    return jsonOk({ verified: true });
  }

  const result = await verifyEmailToken(body.token, await requestFingerprint());
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ verified: true });
}
