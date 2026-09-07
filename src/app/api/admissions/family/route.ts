import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor } from "@/lib/admissions/authz";
import { listForFamily } from "@/lib/admissions/repository";

/** Applications owned by the caller. Ownership comes from the session only. */
export async function GET() {
  const auth = await requireFamilyActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const applications = await listForFamily(auth.actor.userId);
  return jsonOk({ applications });
}
