import type { Role } from "@prisma/client";

export function dashboardPathForRole(role: Role, locale: string) {
  return role === "STAFF" ? `/${locale}/staff/dashboard` : `/${locale}/family/dashboard`;
}
