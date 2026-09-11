import { jsonError, jsonOk } from "@/lib/family/authz";
import { recordAuditEvent } from "@/lib/security/identity-store";
import { requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { upsertMembership as upsertSupabaseMembership } from "@/lib/security/supabase-store";
import { upsertMembership as upsertLocalMembership } from "@/lib/security/identity-store";

const ROLES = ["admin", "manager", "coordinator", "readonly"] as const;

/**
 * Change an existing team member's role on one site. Reuses the same
 * upsert the invitation-accept flow writes with (staff_memberships is the
 * single source of truth for site role) — this just targets an already
 *-known userId instead of a freshly accepted invitation.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { userId?: unknown; siteId?: unknown; role?: unknown };
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
    return jsonError("Only a residence administrator can change a team member's role.", 403);
  }

  if (!ROLES.includes(body.role as (typeof ROLES)[number])) {
    return jsonError("Invalid role.", 400);
  }
  const role = body.role as (typeof ROLES)[number];

  const result = isSupabaseBackend()
    ? await upsertSupabaseMembership({ userId: targetUserId, email: "", siteId, role })
    : { ok: true as const, record: await upsertLocalMembership({ userId: targetUserId, email: "", siteId, role }) };

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  await recordAuditEvent({
    event: "staff.role_changed",
    outcome: "success",
    actorId: auth.principal.userId,
    subject: targetUserId,
    metadata: { siteId, role },
  });

  return jsonOk({ member: result.record });
}
