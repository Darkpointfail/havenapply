import type { Role } from "@prisma/client";

export function dashboardPathForRole(role: Role, locale: string) {
  if (role === "STAFF" || role === "ADMIN") return `/${locale}/staff/dashboard`;
  return `/${locale}/family/dashboard`;
}
