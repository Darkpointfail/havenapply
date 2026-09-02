import { cookies, headers } from "next/headers";
import { AuthTokenPurpose, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mail } from "@/lib/mail";
import { getEnv } from "@/lib/env";
import { generateRawToken, hashPassword, hashToken, verifyPassword } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";

export const SESSION_COOKIE = "haven.session";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["FAMILY", "STAFF"]),
  csrfToken: z.string().min(1),
  inviteKind: z.enum(["caregiver", "staff"]).optional(),
  inviteToken: z.string().min(16).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  csrfToken: z.string().min(1),
});

function cookieSecure() {
  return getEnv().NODE_ENV === "production";
}

async function clientMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent")?.slice(0, 300) || null,
  };
}

export async function createDatabaseSession(userId: string) {
  const rawToken = generateRawToken(32);
  const sessionTokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  const meta = await clientMeta();

  await prisma.session.create({
    data: {
      sessionToken: rawToken.slice(0, 8) + "…" + rawToken.slice(-4), // non-secret label for admin UI
      sessionTokenHash,
      userId,
      expires,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: cookieSecure(),
  });
  return rawToken;
}

export async function destroyDatabaseSession(opts?: { revokeAll?: boolean; userId?: string }) {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const meta = await clientMeta();

  if (opts?.revokeAll && opts.userId) {
    await prisma.session.updateMany({
      where: { userId: opts.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit({
      actorUserId: opts.userId,
      action: "auth.session_revoked",
      entityType: "User",
      entityId: opts.userId,
      metadata: { scope: "all" },
      ipAddress: meta.ipAddress,
    });
  } else if (raw) {
    const hash = hashToken(raw);
    const session = await prisma.session.findFirst({ where: { sessionTokenHash: hash } });
    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      await writeAudit({
        actorUserId: session.userId,
        action: "auth.logout",
        entityType: "Session",
        entityId: session.id,
        ipAddress: meta.ipAddress,
      });
    }
  }

  jar.delete(SESSION_COOKIE);
}

async function issueAuthToken(input: {
  email: string;
  userId?: string;
  purpose: AuthTokenPurpose;
  ttlMs: number;
}) {
  const raw = generateRawToken(32);
  const tokenHash = hashToken(raw);
  await prisma.authToken.create({
    data: {
      email: input.email,
      userId: input.userId,
      purpose: input.purpose,
      tokenHash,
      expiresAt: new Date(Date.now() + input.ttlMs),
    },
  });
  return raw;
}

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  await assertCsrf(data.csrfToken);

  const meta = await clientMeta();
  const rl = rateLimit({
    key: `register:${meta.ipAddress || "unknown"}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { ok: false as const, error: "RATE_LIMITED" as const };

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "EMAIL_TAKEN" as const };

  // Optional invite resume: validates email ownership via one-time invite token.
  let invite:
    | { kind: "caregiver" | "staff"; token: string; ok: true }
    | { ok: false }
    | null = null;
  if (data.inviteToken && data.inviteKind) {
    if (data.inviteKind === "caregiver") {
      const { peekCaregiverInvitation } = await import("@/lib/caregiver-invitations");
      const peek = await peekCaregiverInvitation({
        token: data.inviteToken,
        ipAddress: meta.ipAddress,
        viewerEmail: email,
      });
      if (peek.state !== "VALID") {
        return { ok: false as const, error: "INVITE_INVALID" as const };
      }
      invite = { kind: "caregiver", token: data.inviteToken, ok: true };
    } else {
      const { peekStaffInvitation } = await import("@/lib/staff-invitations");
      const peek = await peekStaffInvitation({
        token: data.inviteToken,
        ipAddress: meta.ipAddress,
        viewerEmail: email,
      });
      if (peek.state !== "VALID") {
        return { ok: false as const, error: "INVITE_INVALID" as const };
      }
      invite = { kind: "staff", token: data.inviteToken, ok: true };
    }
  }

  const role: Role =
    invite?.ok && invite.kind === "staff"
      ? "STAFF"
      : invite?.ok && invite.kind === "caregiver"
        ? "FAMILY"
        : (data.role as Role);

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      role,
      isDevAccount: false,
      emailVerified: invite?.ok ? new Date() : null,
      notificationPreference: { create: {} },
    },
  });

  // Only create a personal family when not joining via caregiver invite.
  if (role === "FAMILY" && !(invite?.ok && invite.kind === "caregiver")) {
    const family = await prisma.familyProfile.create({
      data: {
        ownerUserId: user.id,
        displayName: `${data.name}'s family`,
      },
    });
    await prisma.caregiverMembership.create({
      data: {
        familyProfileId: family.id,
        userId: user.id,
        role: "OWNER",
        acceptedAt: new Date(),
      },
    });
  }

  if (invite?.ok) {
    await createDatabaseSession(user.id);
    if (invite.kind === "caregiver") {
      const { acceptCaregiverInvitation } = await import("@/lib/caregiver-invitations");
      await acceptCaregiverInvitation({
        userId: user.id,
        token: invite.token,
        ipAddress: meta.ipAddress,
      });
    } else {
      const { acceptStaffInvitation } = await import("@/lib/staff-invitations");
      await acceptStaffInvitation({
        userId: user.id,
        token: invite.token,
        ipAddress: meta.ipAddress,
      });
    }
    await writeAudit({
      actorUserId: user.id,
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role, viaInvite: invite.kind },
      ipAddress: meta.ipAddress,
    });
    return {
      ok: true as const,
      userId: user.id,
      role: user.role,
      needsVerification: false as const,
      inviteKind: invite.kind,
    };
  }

  const rawToken = await issueAuthToken({
    email,
    userId: user.id,
    purpose: "EMAIL_VERIFY",
    ttlMs: 24 * 60 * 60 * 1000,
  });

  const env = getEnv();
  const verifyUrl = `${env.APP_URL}/fr/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await mail.send({
    to: email,
    subject: "HavenApply — verify your email",
    text: `Verify your email: ${verifyUrl}\nThis link expires in 24 hours.`,
    html: `<p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  await writeAudit({
    actorUserId: user.id,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role },
    ipAddress: meta.ipAddress,
  });

  return { ok: true as const, userId: user.id, role: user.role, needsVerification: true as const };
}

export async function verifyEmail(input: { email: string; token: string; csrfToken?: string }) {
  const email = input.email.trim().toLowerCase();
  const tokenHash = hashToken(input.token);
  const meta = await clientMeta();

  const record = await prisma.authToken.findFirst({
    where: {
      email,
      purpose: "EMAIL_VERIFY",
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return { ok: false as const, error: "INVALID_TOKEN" as const };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, error: "INVALID_TOKEN" as const };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createDatabaseSession(user.id);
  await writeAudit({
    actorUserId: user.id,
    action: "auth.email_verified",
    entityType: "User",
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return { ok: true as const, role: user.role };
}

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);
  await assertCsrf(data.csrfToken);

  const meta = await clientMeta();
  const email = data.email.toLowerCase();
  const rl = rateLimit({
    key: `login:${meta.ipAddress || "unknown"}:${email}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) return { ok: false as const, error: "RATE_LIMITED" as const };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { ok: false as const, error: "INVALID_CREDENTIALS" as const };
  }

  const match = await verifyPassword(user.passwordHash, data.password);
  if (!match) return { ok: false as const, error: "INVALID_CREDENTIALS" as const };
  if (!user.emailVerified) return { ok: false as const, error: "EMAIL_NOT_VERIFIED" as const };

  await createDatabaseSession(user.id);
  await writeAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return { ok: true as const, userId: user.id, role: user.role };
}

export async function requestPasswordReset(input: { email: string; csrfToken: string }) {
  await assertCsrf(input.csrfToken);
  const email = input.email.trim().toLowerCase();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { ok: false as const, error: "INVALID_EMAIL" as const };

  const meta = await clientMeta();
  const rl = rateLimit({
    key: `reset:${meta.ipAddress || "unknown"}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { ok: false as const, error: "RATE_LIMITED" as const };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed to avoid account enumeration.
  if (!user) return { ok: true as const };

  await prisma.authToken.updateMany({
    where: { email, purpose: "PASSWORD_RESET", usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = await issueAuthToken({
    email,
    userId: user.id,
    purpose: "PASSWORD_RESET",
    ttlMs: 60 * 60 * 1000,
  });

  const env = getEnv();
  const resetUrl = `${env.APP_URL}/fr/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
  await mail.send({
    to: email,
    subject: "HavenApply — reset your password",
    text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  await writeAudit({
    actorUserId: user.id,
    action: "auth.password_reset_requested",
    entityType: "User",
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return { ok: true as const };
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
  csrfToken: string;
}) {
  await assertCsrf(input.csrfToken);
  const email = input.email.trim().toLowerCase();
  const password = z.string().min(8).max(128).parse(input.password);
  const tokenHash = hashToken(input.token);
  const meta = await clientMeta();

  const record = await prisma.authToken.findFirst({
    where: {
      email,
      purpose: "PASSWORD_RESET",
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return { ok: false as const, error: "INVALID_TOKEN" as const };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, error: "INVALID_TOKEN" as const };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await writeAudit({
    actorUserId: user.id,
    action: "auth.password_reset_completed",
    entityType: "User",
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return { ok: true as const };
}
