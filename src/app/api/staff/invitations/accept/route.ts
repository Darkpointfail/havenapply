import { jsonError, jsonOk } from "@/lib/family/authz";
import { registerAccount } from "@/lib/security/auth-service";
import {
  consumeInvitation,
  findCredentialByEmail,
  hashToken,
  upsertMembership,
} from "@/lib/security/identity-store";
import {
  isSupabaseIdentity,
  recordAuditEvent,
} from "@/lib/security/identity-repository";
import { acceptInvitation } from "@/lib/security/identity-supabase";
import { currentPrincipal, requestFingerprint, requireCsrf } from "@/lib/security/guards";

/**
 * Accept a staff invitation: consumes the single-use token, then creates the
 * account if needed and grants membership on the invited site only.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { token?: unknown; password?: unknown; firstName?: unknown; lastName?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (typeof body.token !== "string" || !body.token) {
    return jsonError("Invalid invitation link.", 400);
  }

  const tokenHash = hashToken(body.token);

  // In Supabase mode the invitee signs in with Supabase Auth first; the
  // database then spends the token and grants the membership in one statement,
  // to the account in the session. Nothing in the request names the recipient.
  if (isSupabaseIdentity()) {
    const principal = await currentPrincipal();
    if (!principal) {
      return jsonError("Sign in with your Supabase account before accepting.", 401);
    }

    const accepted = await acceptInvitation(tokenHash);
    if (!accepted.ok) {
      await recordAuditEvent({
        event: "staff.invitation_accept",
        outcome: "failure",
        actorId: principal.userId,
        metadata: { reason: accepted.error },
      });
      return jsonError(accepted.error, 400);
    }

    return jsonOk({ siteId: accepted.siteId, role: accepted.role });
  }

  const consumed = await consumeInvitation(tokenHash);
  if (!consumed.ok) {
    await recordAuditEvent({
      event: "staff.invitation_accept",
      outcome: "failure",
      metadata: { reason: consumed.error },
    });
    return jsonError(consumed.error, 400);
  }

  const invitation = consumed.record;
  let credential = await findCredentialByEmail(invitation.email);

  if (!credential) {
    const created = await registerAccount({
      email: invitation.email,
      password: body.password,
      role: "facility",
      firstName: body.firstName,
      lastName: body.lastName,
      fingerprint: await requestFingerprint(),
    });
    if (!created.ok) return jsonError(created.error, created.status);
    credential = await findCredentialByEmail(invitation.email);
  }

  if (!credential) return jsonError("Unable to create the staff account.", 500);

  await upsertMembership({
    userId: credential.userId,
    email: credential.email,
    siteId: invitation.siteId,
    role: invitation.role,
  });

  await recordAuditEvent({
    event: "staff.invitation_accept",
    outcome: "success",
    actorId: credential.userId,
    subject: invitation.email,
    metadata: { siteId: invitation.siteId, role: invitation.role, invitationId: invitation.id },
  });

  return jsonOk({ siteId: invitation.siteId, role: invitation.role });
}
