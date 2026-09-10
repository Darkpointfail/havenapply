import { jsonError, jsonOk } from "@/lib/family/authz";
import { registerAccount } from "@/lib/security/auth-service";
import { checkPasswordPolicy } from "@/lib/security/password";
import {
  consumeInvitation,
  findCredentialByEmail,
  hashToken,
  recordAuditEvent,
  upsertMembership,
} from "@/lib/security/identity-store";
import {
  createStaffAccount,
  findAccountByEmail,
  upsertMembership as upsertSupabaseMembership,
} from "@/lib/security/supabase-store";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { isSupabaseBackend } from "@/lib/supabase/config";

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

  const consumed = await consumeInvitation(hashToken(body.token));
  if (!consumed.ok) {
    await recordAuditEvent({
      event: "staff.invitation_accept",
      outcome: "failure",
      metadata: { reason: consumed.error },
    });
    return jsonError(consumed.error, 400);
  }

  const invitation = consumed.record;

  if (isSupabaseBackend()) {
    let account = await findAccountByEmail(invitation.email);

    if (!account) {
      const policy = checkPasswordPolicy(body.password);
      if (!policy.ok) return jsonError(policy.error, 400);
      const created = await createStaffAccount({
        email: invitation.email,
        password: body.password as string,
        firstName: typeof body.firstName === "string" ? body.firstName : "",
        lastName: typeof body.lastName === "string" ? body.lastName : "",
      });
      if (!created.ok) return jsonError(created.error, created.status);
      account = { userId: created.userId, email: created.email, role: "facility" };
    }

    const granted = await upsertSupabaseMembership({
      userId: account.userId,
      email: account.email,
      siteId: invitation.siteId,
      role: invitation.role,
    });
    if (!granted.ok) return jsonError(granted.error, 500);

    await recordAuditEvent({
      event: "staff.invitation_accept",
      outcome: "success",
      actorId: account.userId,
      subject: invitation.email,
      metadata: { siteId: invitation.siteId, role: invitation.role, invitationId: invitation.id },
    });

    return jsonOk({ siteId: invitation.siteId, role: invitation.role });
  }

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
