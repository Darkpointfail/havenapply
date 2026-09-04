import { jsonOk } from "@/lib/family/authz";
import { currentPrincipal } from "@/lib/security/guards";
import { listMembershipsForSession } from "@/lib/security/identity-repository";

/**
 * The single source of identity for the browser.
 *
 * The client never asserts who it is: it asks. Role, family scope and staff
 * site scope are all resolved server-side from the session record and the
 * membership table.
 */
export async function GET() {
  const principal = await currentPrincipal();
  if (!principal) return jsonOk({ user: null });

  const memberships =
    principal.role === "facility" || principal.role === "community"
      ? await listMembershipsForSession(principal.userId)
      : [];

  return jsonOk({
    user: {
      id: principal.userId,
      email: principal.email,
      name: principal.displayName,
      role: principal.role,
      // Scope is informational for the UI; every API re-derives it server-side.
      siteIds: [...new Set(memberships.map((m) => m.siteId))],
      siteRoles: memberships.map((m) => ({ siteId: m.siteId, role: m.role })),
    },
  });
}
