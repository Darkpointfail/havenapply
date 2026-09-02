import { CaregiverRole, InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { AuthzError, assertCanMutateFamily } from "@/lib/authz";
import { enqueueOutbox, dispatchOutbox } from "@/lib/outbox";
import {
  InvitationError,
  assertInviteRateLimit,
  invitationTtlMs,
  resolveInvitationState,
  type InvitePublicState,
} from "@/lib/invitation-common";
import { invitationEmail, invitationOutboxPayload } from "@/lib/invitation-email";

const INVITABLE_CAREGIVER_ROLES: CaregiverRole[] = [CaregiverRole.EDITOR, CaregiverRole.VIEWER];

async function assertCanInviteCaregiver(userId: string, familyProfileId: string) {
  // OWNER (or ADMIN via assertCanMutateFamily) may invite limited roles.
  const membership = await prisma.caregiverMembership.findFirst({
    where: {
      userId,
      familyProfileId,
      acceptedAt: { not: null },
      revokedAt: null,
      role: CaregiverRole.OWNER,
    },
  });
  if (!membership) {
    // Allow EDITOR to invite VIEWER only? Spec: "membre autorisé" — use OWNER for invite/revoke.
    throw new AuthzError("FORBIDDEN", 403);
  }
  return membership;
}

export async function createCaregiverInvitation(input: {
  actorUserId: string;
  familyProfileId: string;
  email: string;
  role: CaregiverRole;
  locale?: string;
  ipAddress?: string | null;
}) {
  await assertCanInviteCaregiver(input.actorUserId, input.familyProfileId);
  if (!INVITABLE_CAREGIVER_ROLES.includes(input.role)) {
    throw new InvitationError("ROLE_NOT_INVITABLE", 400);
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new InvitationError("INVALID_EMAIL", 400);

  const family = await prisma.familyProfile.findUniqueOrThrow({
    where: { id: input.familyProfileId },
  });

  // Invalidate previous pending invites for same email+family (replacement).
  await prisma.caregiverInvitation.updateMany({
    where: {
      familyProfileId: input.familyProfileId,
      email,
      status: InvitationStatus.PENDING,
    },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });

  const raw = generateRawToken(32);
  const tokenHash = hashToken(raw);
  const locale = input.locale === "en" ? "en" : "fr";
  const roleLabel = input.role;

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.caregiverInvitation.create({
      data: {
        familyProfileId: input.familyProfileId,
        email,
        role: input.role,
        tokenHash,
        status: InvitationStatus.PENDING,
        invitedByUserId: input.actorUserId,
        expiresAt: new Date(Date.now() + invitationTtlMs()),
      },
    });

    const mail = invitationEmail({
      kind: "caregiver",
      locale,
      rawToken: raw,
      orgOrFamilyLabel: family.displayName,
      roleLabel,
    });
    await enqueueOutbox(tx, {
      type: "invitation.caregiver",
      aggregateType: "CaregiverInvitation",
      aggregateId: created.id,
      idempotencyKey: `invite:caregiver:${created.id}`,
      payload: invitationOutboxPayload({
        toEmail: email,
        subject: mail.subject,
        text: mail.text,
        invitationId: created.id,
        kind: "caregiver",
        locale,
      }),
    });
    return created;
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "caregiver.invitation_created",
    entityType: "CaregiverInvitation",
    entityId: invitation.id,
    metadata: { familyProfileId: input.familyProfileId, role: input.role },
    ipAddress: input.ipAddress,
  });

  void dispatchOutbox().catch(() => undefined);
  return { invitationId: invitation.id, rawToken: raw };
}

export async function peekCaregiverInvitation(input: {
  token: string;
  ipAddress?: string | null;
  viewerEmail?: string | null;
}): Promise<{
  state: InvitePublicState;
  invitationId?: string;
  role?: CaregiverRole;
  familyDisplayName?: string;
  emailHint?: string;
}> {
  assertInviteRateLimit({
    ipAddress: input.ipAddress,
    tokenHint: input.token,
    action: "peek_caregiver",
  });
  if (!input.token || input.token.length < 16) {
    return { state: "NOT_FOUND" };
  }

  const tokenHash = hashToken(input.token);
  const invitation = await prisma.caregiverInvitation.findUnique({
    where: { tokenHash },
    include: { family: { select: { displayName: true } } },
  });
  if (!invitation) return { state: "NOT_FOUND" };

  let state = resolveInvitationState(invitation);
  if (state === "VALID" && invitation.expiresAt.getTime() <= Date.now()) {
    await prisma.caregiverInvitation.updateMany({
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
      entityType: "CaregiverInvitation",
      entityId: invitation.id,
      metadata: { kind: "caregiver" },
      ipAddress: input.ipAddress,
    });
    return {
      state: "WRONG_ACCOUNT",
      invitationId: invitation.id,
      // Masked hint only — never reveal other family data.
      emailHint: maskEmail(invitation.email),
    };
  }

  return {
    state,
    invitationId: invitation.id,
    role: invitation.role,
    familyDisplayName: state === "VALID" ? invitation.family.displayName : undefined,
    emailHint: state === "VALID" ? maskEmail(invitation.email) : undefined,
  };
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function acceptCaregiverInvitation(input: {
  userId: string;
  token: string;
  ipAddress?: string | null;
}) {
  assertInviteRateLimit({
    ipAddress: input.ipAddress,
    tokenHint: input.token,
    action: "accept_caregiver",
  });

  const tokenHash = hashToken(input.token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });

  const result = await prisma.$transaction(async (tx) => {
    const invitation = await tx.caregiverInvitation.findUnique({
      where: { tokenHash },
    });
    if (!invitation) throw new InvitationError("NOT_FOUND", 404);

    const state = resolveInvitationState(invitation);
    if (state === "REVOKED") throw new InvitationError("REVOKED", 410);
    if (state === "USED") throw new InvitationError("USED", 409);
    if (state === "EXPIRED" || invitation.expiresAt.getTime() <= Date.now()) {
      await tx.caregiverInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new InvitationError("EXPIRED", 410);
    }

    if (user.email.toLowerCase() !== invitation.email) {
      throw new InvitationError("WRONG_ACCOUNT", 403);
    }

    // Atomic claim — only one concurrent acceptor wins.
    const claimed = await tx.caregiverInvitation.updateMany({
      where: {
        id: invitation.id,
        status: InvitationStatus.PENDING,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new InvitationError("USED", 409);
    }

    // Ensure FAMILY role (ADMIN stays ADMIN).
    if (user.role !== "ADMIN" && user.role !== "FAMILY") {
      await tx.user.update({
        where: { id: user.id },
        data: { role: "FAMILY" },
      });
    }
    if (!user.emailVerified) {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    const existing = await tx.caregiverMembership.findUnique({
      where: {
        familyProfileId_userId: {
          familyProfileId: invitation.familyProfileId,
          userId: user.id,
        },
      },
    });
    if (existing) {
      await tx.caregiverMembership.update({
        where: { id: existing.id },
        data: {
          role: invitation.role,
          acceptedAt: new Date(),
          revokedAt: null,
          invitedByUserId: invitation.invitedByUserId,
        },
      });
    } else {
      await tx.caregiverMembership.create({
        data: {
          familyProfileId: invitation.familyProfileId,
          userId: user.id,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
          acceptedAt: new Date(),
        },
      });
    }

    // Revoke other pending invites for same email+family.
    await tx.caregiverInvitation.updateMany({
      where: {
        familyProfileId: invitation.familyProfileId,
        email: invitation.email,
        status: InvitationStatus.PENDING,
        id: { not: invitation.id },
      },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });

    return invitation;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "caregiver.invitation_accepted",
    entityType: "CaregiverInvitation",
    entityId: result.id,
    metadata: { familyProfileId: result.familyProfileId },
    ipAddress: input.ipAddress,
  });

  return result;
}

export async function revokeCaregiverInvitation(input: {
  actorUserId: string;
  invitationId: string;
  ipAddress?: string | null;
}) {
  const invitation = await prisma.caregiverInvitation.findUniqueOrThrow({
    where: { id: input.invitationId },
  });
  await assertCanInviteCaregiver(input.actorUserId, invitation.familyProfileId);
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvitationError("NOT_PENDING", 409);
  }
  await prisma.caregiverInvitation.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "caregiver.invitation_revoked",
    entityType: "CaregiverInvitation",
    entityId: invitation.id,
    ipAddress: input.ipAddress,
  });
}

export async function revokeCaregiverMembership(input: {
  actorUserId: string;
  membershipId: string;
  ipAddress?: string | null;
}) {
  const membership = await prisma.caregiverMembership.findUniqueOrThrow({
    where: { id: input.membershipId },
  });
  await assertCanInviteCaregiver(input.actorUserId, membership.familyProfileId);
  if (membership.userId === input.actorUserId) {
    throw new InvitationError("CANNOT_REVOKE_SELF", 400);
  }
  if (membership.role === CaregiverRole.OWNER) {
    throw new InvitationError("CANNOT_REVOKE_OWNER", 400);
  }
  await prisma.caregiverMembership.update({
    where: { id: membership.id },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "caregiver.membership_revoked",
    entityType: "CaregiverMembership",
    entityId: membership.id,
    metadata: { familyProfileId: membership.familyProfileId },
    ipAddress: input.ipAddress,
  });
}

export async function listFamilyMembersAndInvites(userId: string, familyProfileId: string) {
  await assertCanMutateFamily(userId, familyProfileId);
  // OWNER-only for management UI — viewers shouldn't manage.
  await assertCanInviteCaregiver(userId, familyProfileId);

  const [members, invites] = await Promise.all([
    prisma.caregiverMembership.findMany({
      where: { familyProfileId, revokedAt: null, acceptedAt: { not: null } },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.caregiverInvitation.findMany({
      where: { familyProfileId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, invites };
}

export async function resendCaregiverInvitation(input: {
  actorUserId: string;
  invitationId: string;
  locale?: string;
  ipAddress?: string | null;
}) {
  const old = await prisma.caregiverInvitation.findUniqueOrThrow({
    where: { id: input.invitationId },
  });
  await assertCanInviteCaregiver(input.actorUserId, old.familyProfileId);
  if (old.status !== InvitationStatus.PENDING) {
    throw new InvitationError("NOT_PENDING", 409);
  }
  // Replacement: revoke + create new token.
  await prisma.caregiverInvitation.update({
    where: { id: old.id },
    data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
  });
  return createCaregiverInvitation({
    actorUserId: input.actorUserId,
    familyProfileId: old.familyProfileId,
    email: old.email,
    role: old.role,
    locale: input.locale,
    ipAddress: input.ipAddress,
  });
}
