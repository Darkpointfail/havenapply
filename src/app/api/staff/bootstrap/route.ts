import { jsonError, jsonOk } from "@/lib/family/authz";
import { enforceRateLimit } from "@/lib/security/auth-service";
import { findCredentialByEmail, updateCredential } from "@/lib/security/identity-store";
import {
  isSupabaseIdentity,
  recordAuditEvent,
  upsertMembership,
} from "@/lib/security/identity-repository";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { operatorEndpointsEnabled, operatorTokenMatches } from "@/lib/security/operator";

/**
 * Grant the first staff membership on a site.
 *
 * Chicken-and-egg: only a site admin can invite, so the first one has to come
 * from an operator action. Guarded by a deployment secret rather than a
 * session, disabled unless `HAVEN_BOOTSTRAP_TOKEN` is configured, rate limited
 * and audited. It grants membership to an existing account only — it can never
 * create credentials. Designating a site administrator also moves that account
 * to the staff role, which is the point of the operation.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!operatorEndpointsEnabled()) {
    return jsonError("Not found.", 404);
  }

  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const throttled = await enforceRateLimit("invite", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  if (!operatorTokenMatches(request.headers.get("x-haven-bootstrap-token"))) {
    await recordAuditEvent({
      event: "staff.bootstrap",
      outcome: "failure",
      metadata: { reason: "bad_token" },
    });
    return jsonError("Not found.", 404);
  }

  let body: { email?: unknown; userId?: unknown; siteId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!siteId) return jsonError("siteId is required.", 400);

  // In Supabase mode the operator names the account by its auth.users id, read
  // from the dashboard. Resolving an address to an account is exactly the kind
  // of matching that must not happen while serving a request.
  if (isSupabaseIdentity()) {
    if (!UUID.test(userId)) {
      return jsonError("userId must be the Supabase auth.users identifier.", 400);
    }

    const membership = await upsertMembership({
      userId,
      email: "",
      siteId,
      role: "admin",
    });

    await recordAuditEvent({
      event: "staff.bootstrap",
      outcome: "success",
      actorId: userId,
      metadata: { siteId, membershipId: membership.id, backend: "supabase" },
    });

    return jsonOk({ siteId, role: membership.role }, 201);
  }

  if (!email) return jsonError("email and siteId are required.", 400);

  const credential = await findCredentialByEmail(email);
  if (!credential) return jsonError("No account for this address.", 404);

  if (credential.role !== "facility" && credential.role !== "community") {
    await updateCredential(credential.userId, { role: "facility" });
  }

  const membership = await upsertMembership({
    userId: credential.userId,
    email: credential.email,
    siteId,
    role: "admin",
  });

  await recordAuditEvent({
    event: "staff.bootstrap",
    outcome: "success",
    subject: email,
    actorId: credential.userId,
    metadata: { siteId, membershipId: membership.id, roleBefore: credential.role },
  });

  return jsonOk({ siteId, role: membership.role }, 201);
}
