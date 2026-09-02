import { cookies } from "next/headers";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/auth-actions";
import { hashToken } from "@/lib/crypto";

export type AppSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    isDevAccount: boolean;
    emailVerified: boolean;
  };
  expires: string;
  sessionId: string;
};

/**
 * Auth.js Prisma adapter remains for Account/Session model compatibility.
 * Password sessions are created in auth-actions and resolved here via hashed tokens.
 */
export const { handlers, signOut } = NextAuth(() => {
  const env = getEnv();
  return {
    adapter: PrismaAdapter(prisma),
    session: {
      strategy: "database",
      maxAge: 30 * 24 * 60 * 60,
    },
    secret: env.AUTH_SECRET,
    trustHost: true,
    pages: {
      signIn: "/fr/sign-in",
    },
    providers: [],
  };
});

export async function auth(): Promise<AppSession | null> {
  const jar = await cookies();
  const raw =
    jar.get(SESSION_COOKIE)?.value ||
    jar.get(`__Secure-${SESSION_COOKIE}`)?.value;
  if (!raw) return null;

  const sessionTokenHash = hashToken(raw);
  const row = await prisma.session.findFirst({
    where: {
      sessionTokenHash,
      revokedAt: null,
      expires: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!row) return null;

  return {
    sessionId: row.id,
    expires: row.expires.toISOString(),
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      isDevAccount: row.user.isDevAccount,
      emailVerified: Boolean(row.user.emailVerified),
    },
  };
}
