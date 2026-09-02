import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { AuthzError } from "@/lib/authz";

export async function requireSession(locale: string = "fr") {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }
  if (!session.user.emailVerified) {
    redirect(`/${locale}/check-email`);
  }
  return session;
}

export async function requireRole(role: Role | Role[], locale: string = "fr") {
  const session = await requireSession(locale);
  const allowed = Array.isArray(role) ? role : [role];
  if (session.user.role === "ADMIN") return session;
  if (!allowed.includes(session.user.role)) {
    redirect(`/${locale}/access-denied`);
  }
  return session;
}

export function toHttpError(error: unknown): { status: number; code: string } {
  if (error instanceof AuthzError) {
    return { status: error.status, code: error.message };
  }
  if (error instanceof Error && error.message === "CSRF_INVALID") {
    return { status: 403, code: "CSRF_INVALID" };
  }
  return { status: 500, code: "INTERNAL" };
}

export { dashboardPathForRole } from "@/lib/paths";
