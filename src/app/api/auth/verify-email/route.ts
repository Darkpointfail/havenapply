import { jsonError, jsonOk } from "@/lib/family/authz";
import { verifyEmailToken } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { operatorTokenMatches } from "@/lib/security/operator";
import {
  findCredentialByEmail,
  recordAuditEvent,
  updateCredential,
} from "@/lib/security/identity-store";

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
