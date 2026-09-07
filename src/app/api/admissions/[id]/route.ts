import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor, requireStaffActor } from "@/lib/admissions/authz";
import { getDetail } from "@/lib/admissions/repository";

/**
 * Detail for the owning family or for staff of the target site.
 * Anyone else gets 404: a 403 would confirm the application exists.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const family = await requireFamilyActor();
  if (family.ok) {
    const detail = await getDetail({ applicationId: id, familyUserId: family.actor.userId });
    if (detail) return jsonOk({ ...detail });
    return jsonError("Application not found.", 404);
  }

  const staff = await requireStaffActor();
  if (staff.ok) {
    const detail = await getDetail({ applicationId: id, siteIds: staff.actor.siteIds });
    if (detail) return jsonOk({ ...detail });
    return jsonError("Application not found.", 404);
  }

  return jsonError("Session expired. Please sign in again.", 401);
}
