import { jsonError, jsonOk } from "@/lib/family/authz";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { setMembershipStatus as setSupabaseMembershipStatus } from "@/lib/security/supabase-store";
import { setMembershipStatus as setLocalMembershipStatus } from "@/lib/security/identity-store";

const STATUSES = ["active", "suspended"] as const;

/**
 * Suspend (remove access without deleting history) or reactivate a team
 * member on one site. Suspending yourself as the only admin would lock the
 * site out of team management entirely, so that one case is refused; every
 * other combination is left to the admin's judgment.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { userId?: unknown; siteId?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const targetUserId = typeof body.userId === "string" ? body.userId : "";
  if (!targetUserId) return jsonError("A team member must be specified.", 400);

  const scope = scopeToSite(auth.principal, typeof body.siteId === "string" ? body.siteId : null);
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];

  const callerIsAdmin = auth.principal.memberships.some(
    (m) => m.siteId === siteId && m.role === "admin" && m.status === "active",
  );
  if (!callerIsAdmin) {
    return jsonError("Only a residence administrator can suspend a team member.", 403);
  }

  if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return jsonError("Invalid status.", 400);
  }
  const status = body.status as (typeof STATUSES)[number];

  if (status === "suspended" && targetUserId === auth.principal.userId) {
    return jsonError("You can't suspend your own access.", 400);
  }

  const result = isSupabaseBackend()
    ? await setSupabaseMembershipStatus({ userId: targetUserId, siteId, status })
    : await setLocalMembershipStatus({ userId: targetUserId, siteId, status });

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  await recordAuditEvent({
    event: "staff.membership_status_changed",
    outcome: "success",
    actorId: auth.principal.userId,
    subject: targetUserId,
    metadata: { siteId, status },
  });

  return jsonOk({});
}
