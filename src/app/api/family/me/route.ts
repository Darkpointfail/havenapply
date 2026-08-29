import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { loadOrCreateFamilyBundle } from "@/lib/family/repository";

export async function GET() {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const bundle = await loadOrCreateFamilyBundle(auth.user);
    return jsonOk({ bundle });
  } catch {
    return jsonError("Impossible de charger votre dossier.", 500);
  }
}
