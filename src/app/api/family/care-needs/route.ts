import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { patchCareNeeds } from "@/lib/family/repository";
import type { CareNeeds } from "@/lib/care-needs";

export async function PATCH(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { seniorId?: string; careNeeds?: CareNeeds };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!body.careNeeds) return jsonError("Care needs data is missing.", 400);

  const bundle = await patchCareNeeds(auth.user.id, body.seniorId ?? null, body.careNeeds);
  if (!bundle) return jsonError("Impossible d'enregistrer les besoins.", 404);
  return jsonOk({ bundle });
}
