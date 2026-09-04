import { timingSafeEqual } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/family/authz";
import { enforceRateLimit } from "@/lib/security/auth-service";
import {
  findCredentialByEmail,
  recordAuditEvent,
  updateCredential,
  upsertMembership,
} from "@/lib/security/identity-store";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";

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
function tokenMatches(provided: string | null): boolean {
  const expected = process.env.HAVEN_BOOTSTRAP_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.HAVEN_BOOTSTRAP_TOKEN) {
    return jsonError("Bootstrap is not enabled on this deployment.", 404);
  }

  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const throttled = await enforceRateLimit("invite", await requestFingerprint());
  if (throttled) return jsonError(throttled.error, throttled.status);

  if (!tokenMatches(request.headers.get("x-haven-bootstrap-token"))) {
    await recordAuditEvent({
      event: "staff.bootstrap",
      outcome: "failure",
      metadata: { reason: "bad_token" },
    });
    return jsonError("Not found.", 404);
  }

  let body: { email?: unknown; siteId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  if (!email || !siteId) return jsonError("email and siteId are required.", 400);

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
