import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor } from "@/lib/admissions/authz";
import { withdraw } from "@/lib/admissions/repository";

/** The owning family withdraws its application. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const auth = await requireFamilyActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const result = await withdraw({ applicationId: id, familyUserId: auth.actor.userId });
  if (!result.ok) return jsonError(result.error, result.status);

  return jsonOk({ application: result.data });
}
