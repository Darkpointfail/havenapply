import { cookies } from "next/headers";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/auth-actions";

export type AppSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    isDevAccount: boolean;
  };
  expires: string;
};

/**
 * Auth.js is wired with the Prisma adapter (database sessions). Password auth
 * creates Session rows directly (`createDatabaseSession`). Session reads go
 * through Prisma so we never enable the Credentials+JWT-only path.
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
  const token =
    jar.get(SESSION_COOKIE)?.value ||
    jar.get(`__Secure-${SESSION_COOKIE}`)?.value;
  if (!token) return null;

  const row = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!row || row.expires < new Date()) {
    if (row) {
      await prisma.session.delete({ where: { sessionToken: token } }).catch(() => undefined);
    }
    return null;
  }

  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      isDevAccount: row.user.isDevAccount,
    },
    expires: row.expires.toISOString(),
  };
}
