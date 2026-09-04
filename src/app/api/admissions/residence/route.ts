import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireStaffActor, resolveStaffSiteScope } from "@/lib/admissions/authz";
import { listForSites } from "@/lib/admissions/repository";

/**
 * Applications targeting a site the caller is a member of.
 * `?siteId=` may only narrow the membership scope, never widen it.
 */
export async function GET(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const requested = new URL(request.url).searchParams.get("siteId");
  const scope = resolveStaffSiteScope(auth.actor, requested);
  if (!scope.ok) return jsonError(scope.error, scope.status);

  const applications = await listForSites(scope.siteIds);
  return jsonOk({ applications, siteIds: scope.siteIds });
}
