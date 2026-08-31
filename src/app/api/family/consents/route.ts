import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { grantProfileConsent } from "@/lib/family/repository";

export async function POST(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { granted?: boolean; purpose?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  // Only profile_retention is active in this phase.
  if (body.purpose && body.purpose !== "profile_retention") {
    return jsonError(
      "Transmission to a residence is not enabled in this phase. Only the profile retention consent is available.",
      400,
    );
  }
  if (typeof body.granted !== "boolean") {
    return jsonError("Indiquez si vous acceptez ou retirez le consentement.", 400);
  }

  const bundle = await grantProfileConsent(auth.user.id, body.granted);
  if (!bundle) return jsonError("Impossible d'enregistrer le consentement.", 404);
  return jsonOk({ bundle });
}
