import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { patchDossier, patchEmergencyContacts } from "@/lib/family/repository";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { EmergencyContactDto } from "@/lib/family/types";

export async function PATCH(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: {
    seniorId?: string;
    dossier?: ResidentDossier;
    emergencyContacts?: EmergencyContactDto[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Requête invalide.", 400);
  }

  let bundle = null;
  if (body.dossier) {
    bundle = await patchDossier(auth.user.id, body.seniorId ?? null, body.dossier);
  }
  if (body.emergencyContacts) {
    bundle = await patchEmergencyContacts(
      auth.user.id,
      body.seniorId ?? null,
      body.emergencyContacts,
    );
  }
  if (!bundle) return jsonError("Aucune donnée à enregistrer.", 400);
  return jsonOk({ bundle });
}
