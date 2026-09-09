import { jsonError, jsonOk } from "@/lib/family/authz";
import { getProfile } from "@/lib/community-profile/repository";
import { resolveKnownSite } from "@/lib/admissions/site-registry";

/**
 * Public: the listing pages families browse read a residence's saved
 * profile from here. No auth — this is meant to be public, same as the
 * catalog pages that fall back to it. Also resolves the registry name so a
 * client that has no saved profile yet (a freshly claimed, non-curated
 * residence) doesn't have to bundle the 1.6MB Québec RPA catalog just to
 * show a blank profile with the right name on it.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await ctx.params;
  if (!siteId) return jsonError("siteId is required.", 400);
  const profile = await getProfile(siteId);
  const site = resolveKnownSite(siteId);
  return jsonOk({ profile, siteName: site?.name ?? null });
}
