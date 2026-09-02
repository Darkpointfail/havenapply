"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { CaregiverRole, StaffOrgRole } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { assertCsrf, CSRF_FIELD } from "@/lib/csrf";
import { isLocale } from "@/lib/i18n";
import { AuthzError } from "@/lib/authz";
import { InvitationError } from "@/lib/invitation-common";
import {
  acceptCaregiverInvitation,
  createCaregiverInvitation,
  resendCaregiverInvitation,
  revokeCaregiverInvitation,
  revokeCaregiverMembership,
} from "@/lib/caregiver-invitations";
import {
  acceptStaffInvitation,
  createStaffInvitation,
  resendStaffInvitation,
  revokeStaffInvitation,
  revokeStaffMembership,
} from "@/lib/staff-invitations";
import { getPrimaryFamilyProfileId } from "@/lib/applications";

function localeOrFr(locale: string) {
  return isLocale(locale) ? locale : "fr";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
}

function rethrowRedirect(error: unknown): void {
  if (isRedirectError(error)) throw error;
}

function errorRedirect(locale: string, path: string, code: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`/${localeOrFr(locale)}${path}${sep}error=${encodeURIComponent(code)}`);
}

export async function acceptCaregiverInviteAction(
  locale: string,
  token: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["FAMILY", "ADMIN"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await acceptCaregiverInvitation({
      userId: session.user.id,
      token,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/dashboard?invite=accepted`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof InvitationError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "ACCEPT_FAILED";
    errorRedirect(loc, `/invite/caregiver?t=${encodeURIComponent(token)}`, code);
  }
}

export async function acceptStaffInviteAction(
  locale: string,
  token: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["STAFF", "ADMIN", "FAMILY"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await acceptStaffInvitation({
      userId: session.user.id,
      token,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/staff/dashboard?invite=accepted`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof InvitationError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "ACCEPT_FAILED";
    errorRedirect(loc, `/invite/staff?t=${encodeURIComponent(token)}`, code);
  }
}

export async function createCaregiverInviteAction(locale: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  const familyProfileId =
    String(formData.get("familyProfileId") || "") ||
    (await getPrimaryFamilyProfileId(session.user.id));
  const roleRaw = String(formData.get("role") || "VIEWER");
  const role =
    roleRaw === "EDITOR" ? CaregiverRole.EDITOR : CaregiverRole.VIEWER;
  try {
    await createCaregiverInvitation({
      actorUserId: session.user.id,
      familyProfileId,
      email: String(formData.get("email") || ""),
      role,
      locale: loc,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/members?ok=invited`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof InvitationError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "INVITE_FAILED";
    errorRedirect(loc, "/family/members", code);
  }
}

export async function createStaffInviteAction(locale: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["STAFF", "ADMIN"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  const orgRoleRaw = String(formData.get("orgRole") || "VIEWER");
  const orgRole =
    orgRoleRaw === "OWNER"
      ? StaffOrgRole.OWNER
      : orgRoleRaw === "EDITOR"
        ? StaffOrgRole.EDITOR
        : StaffOrgRole.VIEWER;
  const siteIds = formData
    .getAll("siteIds")
    .map((v) => String(v))
    .filter(Boolean);
  try {
    await createStaffInvitation({
      actorUserId: session.user.id,
      organizationId: String(formData.get("organizationId") || ""),
      siteIds,
      email: String(formData.get("email") || ""),
      orgRole,
      locale: loc,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/staff/members?ok=invited`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof InvitationError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "INVITE_FAILED";
    errorRedirect(loc, "/staff/members", code);
  }
}

export async function revokeCaregiverInviteAction(
  locale: string,
  invitationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await revokeCaregiverInvitation({
      actorUserId: session.user.id,
      invitationId,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/members?ok=revoked`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/family/members", "REVOKE_FAILED");
  }
}

export async function revokeCaregiverMemberAction(
  locale: string,
  membershipId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await revokeCaregiverMembership({
      actorUserId: session.user.id,
      membershipId,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/members?ok=member_revoked`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/family/members", "REVOKE_FAILED");
  }
}

export async function resendCaregiverInviteAction(
  locale: string,
  invitationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await resendCaregiverInvitation({
      actorUserId: session.user.id,
      invitationId,
      locale: loc,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/members?ok=resent`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/family/members", "RESEND_FAILED");
  }
}

export async function revokeStaffInviteAction(
  locale: string,
  invitationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["STAFF", "ADMIN"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await revokeStaffInvitation({
      actorUserId: session.user.id,
      invitationId,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/staff/members?ok=revoked`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/staff/members", "REVOKE_FAILED");
  }
}

export async function revokeStaffMemberAction(
  locale: string,
  membershipId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["STAFF", "ADMIN"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await revokeStaffMembership({
      actorUserId: session.user.id,
      membershipId,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/staff/members?ok=member_revoked`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/staff/members", "REVOKE_FAILED");
  }
}

export async function resendStaffInviteAction(
  locale: string,
  invitationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole(["STAFF", "ADMIN"], loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await resendStaffInvitation({
      actorUserId: session.user.id,
      invitationId,
      locale: loc,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/staff/members?ok=resent`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, "/staff/members", "RESEND_FAILED");
  }
}
