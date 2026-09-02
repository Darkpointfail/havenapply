import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export async function requireSession(locale: string = "fr") {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }
  return session;
}

export async function requireRole(role: Role, locale: string = "fr") {
  const session = await requireSession(locale);
  if (session.user.role !== role) {
    redirect(`/${locale}/access-denied`);
  }
  return session;
}

export { dashboardPathForRole } from "@/lib/paths";
