import { jsonError, jsonOk } from "@/lib/family/authz";
import { enforceRateLimit } from "@/lib/security/auth-service";
import { newToken } from "@/lib/security/password";
import {
  createInvitation,
  hashToken,
  recordAuditEvent,
} from "@/lib/security/identity-store";
import { requestFingerprint, requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 72; // 72 h
const ROLES = ["admin", "manager", "coordinator", "readonly"] as const;

/**
 * Invite a colleague to one of the caller's sites.
 * Single use, expiring, auditable; only a site admin may invite.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const throttled = await enforceRateLimit("invite", auth.principal.userId);
  if (throttled) return jsonError(throttled.error, throttled.status);

  let body: { email?: unknown; siteId?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  const scope = scopeToSite(auth.principal, typeof body.siteId === "string" ? body.siteId : null);
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];

  const inviterIsAdmin = auth.principal.memberships.some(
    (m) => m.siteId === siteId && m.role === "admin",
  );
  if (!inviterIsAdmin) {
    return jsonError("Only a residence administrator can invite staff.", 403);
  }

  const role = ROLES.includes(body.role as (typeof ROLES)[number])
    ? (body.role as (typeof ROLES)[number])
    : "readonly";

  const token = newToken();
  const invitation = await createInvitation({
    email,
    siteId,
    role,
    tokenHash: hashToken(token),
    ttlMs: INVITATION_TTL_MS,
    invitedByUserId: auth.principal.userId,
  });

  await recordAuditEvent({
    event: "staff.invitation_created",
    outcome: "success",
    actorId: auth.principal.userId,
    subject: email,
    metadata: { siteId, role, invitationId: invitation.id },
  });

  // Returned only outside production; a mail transport delivers it otherwise.
  const devToken = process.env.NODE_ENV === "production" ? undefined : token;
  await requestFingerprint();

  return jsonOk({ invitationId: invitation.id, expiresAt: invitation.expiresAt, token: devToken }, 201);
}
