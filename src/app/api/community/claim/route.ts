import { jsonError, jsonOk } from "@/lib/family/authz";
import { currentPrincipal } from "@/lib/security/guards";
import { consumeSiteClaim, recordAuditEvent } from "@/lib/security/identity-store";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { enforceRateLimit } from "@/lib/security/auth-service";

/**
 * Claim free, self-serve access to a residence's console: a non-client
 * residence follows a link tied to a dossier sent their way, signs in or
 * creates an account, then consumes this to become that site's first admin.
 * `consumeSiteClaim` refuses if the site already has active staff, so a
 * leaked or reused link can never hijack an already-active client.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const throttled = await enforceRateLimit("siteClaim", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  const principal = await currentPrincipal();
  if (!principal) return jsonError("Sign in first.", 401);

  let body: { token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (typeof body.token !== "string" || !body.token) {
    return jsonError("Invalid claim link.", 400);
  }

  const result = await consumeSiteClaim(body.token, principal.userId, principal.email);
  if (!result.ok) {
    await recordAuditEvent({
      event: "site_claim.consume",
      outcome: "failure",
      actorId: principal.userId,
      metadata: { reason: result.error },
    });
    return jsonError(result.error, 409);
  }

  await recordAuditEvent({
    event: "site_claim.consume",
    outcome: "success",
    actorId: principal.userId,
    subject: principal.email,
    metadata: { siteId: result.siteId },
  });

  return jsonOk({ siteId: result.siteId });
}
