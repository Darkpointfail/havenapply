import { randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mail } from "@/lib/mail";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "authjs.session-token";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["FAMILY", "STAFF"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function cookieSecure() {
  return getEnv().NODE_ENV === "production";
}

export async function createDatabaseSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: cookieSecure(),
  });
  return sessionToken;
}

export async function destroyDatabaseSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
    jar.delete(SESSION_COOKIE);
  }
}

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, error: "EMAIL_TAKEN" };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      role: data.role as Role,
      isDevAccount: false,
      emailVerified: null,
    },
  });

  await createDatabaseSession(user.id);
  return { ok: true as const, userId: user.id, role: user.role };
}

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);
  const email = data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { ok: false as const, error: "INVALID_CREDENTIALS" };
  }
  const match = await bcrypt.compare(data.password, user.passwordHash);
  if (!match) {
    return { ok: false as const, error: "INVALID_CREDENTIALS" };
  }
  await createDatabaseSession(user.id);
  return { ok: true as const, userId: user.id, role: user.role };
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { ok: false as const, error: "INVALID_EMAIL" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed to avoid account enumeration.
  if (!user) return { ok: true as const };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const env = getEnv();
  const resetUrl = `${env.APP_URL}/fr/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await mail.send({
    to: email,
    subject: "HavenApply — reset your password",
    text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
  });

  return { ok: true as const };
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const password = z.string().min(8).max(128).parse(input.password);
  const record = await prisma.verificationToken.findUnique({
    where: { token: input.token },
  });
  if (!record || record.identifier !== email || record.expires < new Date()) {
    return { ok: false as const, error: "INVALID_TOKEN" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token: input.token } }),
    prisma.session.deleteMany({ where: { user: { email } } }),
  ]);

  return { ok: true as const };
}
