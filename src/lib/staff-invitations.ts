import { StaffPermission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/crypto";
import { mail } from "@/lib/mail";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { assertStaffPermission, AuthzError } from "@/lib/authz";

export async function createStaffInvitation(input: {
  actorUserId: string;
  organizationId: string;
  siteId?: string | null;
  email: string;
  permissions: StaffPermission[];
  ipAddress?: string | null;
}) {
  await assertStaffPermission(
    input.actorUserId,
    input.organizationId,
    "MANAGE_STAFF",
    input.siteId,
  );

  const email = input.email.trim().toLowerCase();
  const raw = generateRawToken(32);
  const tokenHash = hashToken(raw);
  const invitation = await prisma.staffInvitation.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId || null,
      email,
      tokenHash,
      invitedByUserId: input.actorUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      permissions: {
        create: input.permissions.map((permission) => ({ permission })),
      },
    },
  });

  const env = getEnv();
  const url = `${env.APP_URL}/fr/staff/accept-invite?token=${raw}&email=${encodeURIComponent(email)}`;
  await mail.send({
    to: email,
    subject: "HavenApply — staff invitation",
    text: `You are invited to join a residence organization. Accept: ${url}`,
    html: `<p>You are invited to join a residence organization.</p><p><a href="${url}">Accept invitation</a></p>`,
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "staff.invitation_created",
    entityType: "StaffInvitation",
    entityId: invitation.id,
    metadata: { organizationId: input.organizationId, siteId: input.siteId ?? null },
    ipAddress: input.ipAddress,
  });

  return { invitationId: invitation.id, rawToken: raw };
}

export async function acceptStaffInvitation(input: {
  userId: string;
  email: string;
  token: string;
  ipAddress?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.staffInvitation.findFirst({
    where: {
      email,
      tokenHash,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { permissions: true },
  });
  if (!invitation) throw new AuthzError("INVITATION_NOT_FOUND", 404);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  if (user.email.toLowerCase() !== email) throw new AuthzError("FORBIDDEN", 403);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: user.role === "ADMIN" ? "ADMIN" : "STAFF" },
    });
    const membership = await tx.staffMembership.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        siteId: invitation.siteId,
        permissions: {
          create: invitation.permissions.map((p) => ({ permission: p.permission })),
        },
      },
    });
    await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return membership;
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "staff.invitation_accepted",
    entityType: "StaffInvitation",
    entityId: invitation.id,
    metadata: { organizationId: invitation.organizationId },
    ipAddress: input.ipAddress,
  });
}
