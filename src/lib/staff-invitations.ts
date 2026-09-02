import { InvitationStatus, StaffOrgRole, type StaffPermission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { AuthzError, getStaffMembershipForSite } from "@/lib/authz";
import { enqueueOutbox, dispatchOutbox } from "@/lib/outbox";
import {
  InvitationError,
  assertInviteRateLimit,
  invitationTtlMs,
  permissionsForStaffOrgRole,
  resolveInvitationState,
  type InvitePublicState,
} from "@/lib/invitation-common";
import { invitationEmail, invitationOutboxPayload } from "@/lib/invitation-email";

async function assertStaffOwner(userId: string, organizationId: string, siteId?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return;

  const memberships = await prisma.staffMembership.findMany({
    where: {
      userId,
      organizationId,
      revokedAt: null,
      orgRole: StaffOrgRole.OWNER,
      ...(siteId
        ? { OR: [{ siteId: null }, { siteId }] }
        : {}),
    },
  });
  if (memberships.length === 0) throw new AuthzError("FORBIDDEN", 403);
  return memberships[0]!;
}

export async function createStaffInvitation(input: {
  actorUserId: string;
  organizationId: string;
  /** Empty / omit = organization-wide. Otherwise precise site list. */
  siteIds?: string[];
  email: string;
  orgRole: StaffOrgRole;
  locale?: string;
  ipAddress?: string | null;
}) {
  await assertStaffOwner(input.actorUserId, input.organizationId);

  if (input.orgRole === StaffOrgRole.OWNER) {
    // Only OWNER (already asserted) may invite/promote another OWNER.
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new InvitationError("INVALID_EMAIL", 400);

  const org = await prisma.residenceOrganization.findUniqueOrThrow({
    where: { id: input.organizationId },
    include: { sites: { select: { id: true } } },
  });

  const siteIds = [...new Set((input.siteIds || []).filter(Boolean))];
  for (const siteId of siteIds) {
    if (!org.sites.some((s) => s.id === siteId)) {
      throw new InvitationError("SITE_NOT_IN_ORG", 400);
    }
  }

  // Invalidate previous pending invites for same email+org.
  await prisma.staffInvitation.updateMany({
    where: {
      organizationId: input.organizationId,
      email,
      status: InvitationStatus.PENDING,
    },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });

  const raw = generateRawToken(32);
  const tokenHash = hashToken(raw);
  const permissions = permissionsForStaffOrgRole(input.orgRole) as StaffPermission[];
  const locale = input.locale === "en" ? "en" : "fr";
  const primarySiteId = siteIds.length === 1 ? siteIds[0]! : null;

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.staffInvitation.create({
      data: {
        organizationId: input.organizationId,
        siteId: primarySiteId,
        email,
        tokenHash,
        status: InvitationStatus.PENDING,
        orgRole: input.orgRole,
        invitedByUserId: input.actorUserId,
        expiresAt: new Date(Date.now() + invitationTtlMs()),
        permissions: {
          create: permissions.map((permission) => ({ permission })),
        },
        sites:
          siteIds.length > 0
            ? { create: siteIds.map((siteId) => ({ siteId })) }
            : undefined,
      },
      include: { sites: true, permissions: true },
    });

    const mail = invitationEmail({
      kind: "staff",
      locale,
      rawToken: raw,
      orgOrFamilyLabel: org.name,
      roleLabel: input.orgRole,
    });
    await enqueueOutbox(tx, {
      type: "invitation.staff",
      aggregateType: "StaffInvitation",
      aggregateId: created.id,
      idempotencyKey: `invite:staff:${created.id}`,
      payload: invitationOutboxPayload({
        toEmail: email,
        subject: mail.subject,
        text: mail.text,
        invitationId: created.id,
        kind: "staff",
        locale,
      }),
    });
    return created;
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "staff.invitation_created",
    entityType: "StaffInvitation",
    entityId: invitation.id,
    metadata: {
      organizationId: input.organizationId,
      orgRole: input.orgRole,
      siteIds,
    },
    ipAddress: input.ipAddress,
  });

  void dispatchOutbox().catch(() => undefined);
  return { invitationId: invitation.id, rawToken: raw };
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

export async function peekStaffInvitation(input: {
  token: string;
  ipAddress?: string | null;
  viewerEmail?: string | null;
}): Promise<{
  state: InvitePublicState;
  invitationId?: string;
  orgRole?: StaffOrgRole;
  organizationName?: string;
  emailHint?: string;
}> {
  assertInviteRateLimit({
    ipAddress: input.ipAddress,
    tokenHint: input.token,
    action: "peek_staff",
  });
  if (!input.token || input.token.length < 16) return { state: "NOT_FOUND" };

  const tokenHash = hashToken(input.token);
  const invitation = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation) return { state: "NOT_FOUND" };

  let state = resolveInvitationState(invitation);
  if (state === "VALID" && invitation.expiresAt.getTime() <= Date.now()) {
    await prisma.staffInvitation.updateMany({
      where: { id: invitation.id, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.EXPIRED },
    });
    state = "EXPIRED";
  }

  if (
    state === "VALID" &&
    input.viewerEmail &&
    input.viewerEmail.trim().toLowerCase() !== invitation.email
  ) {
    await writeAudit({
      action: "invitation.wrong_account",
      entityType: "StaffInvitation",
      entityId: invitation.id,
      metadata: { kind: "staff" },
      ipAddress: input.ipAddress,
    });
    return {
      state: "WRONG_ACCOUNT",
      invitationId: invitation.id,
      emailHint: maskEmail(invitation.email),
    };
  }

  return {
    state,
    invitationId: invitation.id,
    orgRole: invitation.orgRole,
    organizationName: state === "VALID" ? invitation.organization.name : undefined,
    emailHint: state === "VALID" ? maskEmail(invitation.email) : undefined,
  };
}

export async function acceptStaffInvitation(input: {
  userId: string;
  token: string;
  ipAddress?: string | null;
}) {
  assertInviteRateLimit({
    ipAddress: input.ipAddress,
    tokenHint: input.token,
    action: "accept_staff",
  });

  const tokenHash = hashToken(input.token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });

  const invitation = await prisma.$transaction(async (tx) => {
    const inv = await tx.staffInvitation.findUnique({
      where: { tokenHash },
      include: { permissions: true, sites: true },
    });
    if (!inv) throw new InvitationError("NOT_FOUND", 404);

    const state = resolveInvitationState(inv);
    if (state === "REVOKED") throw new InvitationError("REVOKED", 410);
    if (state === "USED") throw new InvitationError("USED", 409);
    if (state === "EXPIRED" || inv.expiresAt.getTime() <= Date.now()) {
      await tx.staffInvitation.updateMany({
        where: { id: inv.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new InvitationError("EXPIRED", 410);
    }
    if (user.email.toLowerCase() !== inv.email) {
      throw new InvitationError("WRONG_ACCOUNT", 403);
    }

    const claimed = await tx.staffInvitation.updateMany({
      where: {
        id: inv.id,
        status: InvitationStatus.PENDING,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new InvitationError("USED", 409);

    await tx.user.update({
      where: { id: user.id },
      data: {
        role: user.role === "ADMIN" ? "ADMIN" : "STAFF",
        emailVerified: user.emailVerified ?? new Date(),
      },
    });

    const siteIds =
      inv.sites.length > 0
        ? inv.sites.map((s) => s.siteId)
        : inv.siteId
          ? [inv.siteId]
          : [null];

    for (const siteId of siteIds) {
      const existing = await tx.staffMembership.findFirst({
        where: {
          userId: user.id,
          organizationId: inv.organizationId,
          siteId,
        },
      });
      if (existing) {
        await tx.staffMembershipPermission.deleteMany({
          where: { membershipId: existing.id },
        });
        await tx.staffMembership.update({
          where: { id: existing.id },
          data: {
            orgRole: inv.orgRole,
            revokedAt: null,
            permissions: {
              create: inv.permissions.map((p) => ({ permission: p.permission })),
            },
          },
        });
      } else {
        await tx.staffMembership.create({
          data: {
            userId: user.id,
            organizationId: inv.organizationId,
            siteId,
            orgRole: inv.orgRole,
            permissions: {
              create: inv.permissions.map((p) => ({ permission: p.permission })),
            },
          },
        });
      }
    }

    await tx.staffInvitation.updateMany({
      where: {
        organizationId: inv.organizationId,
        email: inv.email,
        status: InvitationStatus.PENDING,
        id: { not: inv.id },
      },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });

    return inv;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "staff.invitation_accepted",
    entityType: "StaffInvitation",
    entityId: invitation.id,
    metadata: { organizationId: invitation.organizationId, orgRole: invitation.orgRole },
    ipAddress: input.ipAddress,
  });

  return invitation;
}

export async function revokeStaffInvitation(input: {
  actorUserId: string;
  invitationId: string;
  ipAddress?: string | null;
}) {
  const invitation = await prisma.staffInvitation.findUniqueOrThrow({
    where: { id: input.invitationId },
  });
  await assertStaffOwner(input.actorUserId, invitation.organizationId, invitation.siteId);
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvitationError("NOT_PENDING", 409);
  }
  await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "staff.invitation_revoked",
    entityType: "StaffInvitation",
    entityId: invitation.id,
    ipAddress: input.ipAddress,
  });
}

export async function revokeStaffMembership(input: {
  actorUserId: string;
  membershipId: string;
  ipAddress?: string | null;
}) {
  const membership = await prisma.staffMembership.findUniqueOrThrow({
    where: { id: input.membershipId },
  });
  await assertStaffOwner(input.actorUserId, membership.organizationId, membership.siteId);
  if (membership.userId === input.actorUserId) {
    throw new InvitationError("CANNOT_REVOKE_SELF", 400);
  }
  await prisma.staffMembership.update({
    where: { id: membership.id },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "staff.membership_revoked",
    entityType: "StaffMembership",
    entityId: membership.id,
    metadata: { organizationId: membership.organizationId },
    ipAddress: input.ipAddress,
  });
}

export async function resendStaffInvitation(input: {
  actorUserId: string;
  invitationId: string;
  locale?: string;
  ipAddress?: string | null;
}) {
  const old = await prisma.staffInvitation.findUniqueOrThrow({
    where: { id: input.invitationId },
    include: { sites: true },
  });
  await assertStaffOwner(input.actorUserId, old.organizationId, old.siteId);
  if (old.status !== InvitationStatus.PENDING) {
    throw new InvitationError("NOT_PENDING", 409);
  }
  await prisma.staffInvitation.update({
    where: { id: old.id },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });
  const siteIds =
    old.sites.length > 0
      ? old.sites.map((s) => s.siteId)
      : old.siteId
        ? [old.siteId]
        : [];
  return createStaffInvitation({
    actorUserId: input.actorUserId,
    organizationId: old.organizationId,
    siteIds,
    email: old.email,
    orgRole: old.orgRole,
    locale: input.locale,
    ipAddress: input.ipAddress,
  });
}

export async function listStaffOrgMembersAndInvites(userId: string, organizationId: string) {
  await assertStaffOwner(userId, organizationId);
  const [members, invites, sites] = await Promise.all([
    prisma.staffMembership.findMany({
      where: { organizationId, revokedAt: null },
      include: {
        user: { select: { id: true, email: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staffInvitation.findMany({
      where: { organizationId, status: InvitationStatus.PENDING },
      include: { sites: { include: { site: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.residenceSite.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
  ]);
  return { members, invites, sites };
}

/** Resolve actor's primary org for management UI (first OWNER membership). */
export async function getManagedOrganizationId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") {
    const org = await prisma.residenceOrganization.findFirst({ orderBy: { createdAt: "asc" } });
    return org?.id ?? null;
  }
  const m = await prisma.staffMembership.findFirst({
    where: { userId, orgRole: StaffOrgRole.OWNER, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return m?.organizationId ?? null;
}

export { getStaffMembershipForSite };
