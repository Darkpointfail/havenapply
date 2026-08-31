import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { patchApplicant } from "@/lib/family/repository";
import { clampString, validateApplicantPatch } from "@/lib/family/validation";

export async function PATCH(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const err = validateApplicantPatch(body);
  if (err) return jsonError(err, 400);

  const patch = {
    firstName: body.firstName != null ? clampString(body.firstName, 80) : undefined,
    lastName: body.lastName != null ? clampString(body.lastName, 80) : undefined,
    email: body.email != null ? clampString(body.email, 200) : undefined,
    phone: body.phone != null ? clampString(body.phone, 40) : undefined,
    relationshipToSenior:
      body.relationshipToSenior != null ? clampString(body.relationshipToSenior, 80) : undefined,
    communicationPreference:
      body.communicationPreference != null
        ? clampString(body.communicationPreference, 80)
        : undefined,
    preferredLanguage:
      body.preferredLanguage != null ? clampString(body.preferredLanguage, 20) : undefined,
  };

  const bundle = await patchApplicant(auth.user.id, patch);
  if (!bundle) return jsonError("Compte introuvable.", 404);
  return jsonOk({ bundle });
}
