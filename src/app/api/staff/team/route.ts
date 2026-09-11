import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireStaff, scopeToSite } from "@/lib/security/guards";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { listTeamForSite as listSupabaseTeamForSite } from "@/lib/security/supabase-store";
import { listTeamForSite as listLocalTeamForSite } from "@/lib/security/identity-store";

/**
 * List a residence's team with real names/emails (joined from `profiles` in
 * Supabase mode). Any active member of the site may see the roster — it's a
 * directory, like the existing UI already assumed (workspace.team was
 * rendered to every role, only the invite/edit controls were gated behind
 * manageTeam). Changing a role or suspending someone stays admin-only (see
 * staff/team/role and staff/team/status).
 */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const scope = scopeToSite(auth.principal, searchParams.get("siteId"));
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];
  if (!siteId) return jsonError("A residence must be specified.", 400);

  const team = isSupabaseBackend()
    ? await listSupabaseTeamForSite(siteId)
    : await listLocalTeamForSite(siteId);

  return jsonOk({ team });
}
