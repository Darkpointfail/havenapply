import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";
import { removeAvailability } from "@/lib/community-availability/repository";

function canEditAvailability(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const { id } = await ctx.params;

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const scope = scopeToSite(auth.principal, searchParams.get("siteId"));
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];
  if (!siteId) return jsonError("A residence must be specified.", 400);

  const membership = auth.principal.memberships.find(
    (m) => m.siteId === siteId && m.status === "active",
  );
  if (!membership || !canEditAvailability(membership.role)) {
    return jsonError("You don't have permission to edit availability.", 403);
  }

  const result = await removeAvailability(siteId, id);
  if (!result.ok) return jsonError(result.error, 404);
  return jsonOk({});
}
