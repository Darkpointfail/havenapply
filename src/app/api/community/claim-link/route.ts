import { jsonError, jsonOk } from "@/lib/family/authz";
import { enforceRateLimit } from "@/lib/security/auth-service";
import { createSiteClaim, listMembershipsBySite, recordAuditEvent } from "@/lib/security/identity-store";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { operatorEndpointsEnabled, operatorTokenMatches } from "@/lib/security/operator";
import { resolveKnownSite } from "@/lib/admissions/site-registry";

/**
 * With no mail transport yet, an operator holding the deployment secret
 * mints the free-access link for a non-client residence and delivers it
 * out of band (same pattern as staff invitations in
 * api/staff/invitations/route.ts). Refuses if the site already has staff —
 * there is nothing to claim.
 */
export async function POST(request: Request) {
  if (!operatorEndpointsEnabled()) return jsonError("Not found.", 404);

  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const throttled = await enforceRateLimit("invite", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  if (!operatorTokenMatches(request.headers.get("x-haven-bootstrap-token"))) {
    return jsonError("Not found.", 404);
  }

  let body: { siteId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  if (!siteId) return jsonError("siteId is required.", 400);

  const site = resolveKnownSite(siteId);
  if (!site) return jsonError("Unknown residence.", 404);

  const existingStaff = await listMembershipsBySite(siteId);
  if (existingStaff.length > 0) {
    return jsonError("Cette résidence a déjà un accès actif — rien à réclamer.", 409);
  }

  const { record, token } = await createSiteClaim(siteId);

  await recordAuditEvent({
    event: "site_claim.created",
    outcome: "success",
    metadata: { siteId, claimId: record.id },
  });

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return jsonOk(
    { siteId, siteName: site.name, claimUrl: `${origin}/community/claim/${token}` },
    201,
  );
}
