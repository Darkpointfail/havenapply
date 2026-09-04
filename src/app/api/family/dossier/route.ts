import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { patchDossier, patchEmergencyContacts } from "@/lib/family/repository";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { EmergencyContactDto } from "@/lib/family/types";
import { requireCsrf } from "@/lib/security/guards";

export async function PATCH(request: Request) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

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
    return jsonError("Invalid request.", 400);
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
  if (!bundle) return jsonError("No data to save.", 400);
  return jsonOk({ bundle });
}
