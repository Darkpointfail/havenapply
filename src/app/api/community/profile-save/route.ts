import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";
import { saveProfile } from "@/lib/community-profile/repository";
import type { CommunityProfile } from "@/lib/community-portal";

const MAX_PROFILE_BYTES = 80_000;

/**
 * Staff write: save a residence's own public-facing profile. Readonly
 * members may view but not edit — same spirit as the deciding-role check
 * used for admission decisions.
 */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { siteId?: unknown; profile?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const scope = scopeToSite(auth.principal, siteId);
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const targetSiteId = scope.siteIds[0];

  const membership = auth.principal.memberships.find(
    (m) => m.siteId === targetSiteId && m.status === "active",
  );
  if (!membership || membership.role === "readonly") {
    return jsonError("You don't have permission to edit this residence's profile.", 403);
  }

  if (!body.profile || typeof body.profile !== "object" || Array.isArray(body.profile)) {
    return jsonError("Invalid profile payload.", 400);
  }
  let json: string;
  try {
    json = JSON.stringify(body.profile);
  } catch {
    return jsonError("Invalid profile payload.", 400);
  }
  if (json.length > MAX_PROFILE_BYTES) {
    return jsonError("Profile payload is too large.", 400);
  }

  const profile = { ...(body.profile as CommunityProfile), residenceId: targetSiteId };
  const saved = await saveProfile(targetSiteId, profile);
  return jsonOk({ profile: saved });
}
