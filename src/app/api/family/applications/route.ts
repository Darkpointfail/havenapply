import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { persistApplications } from "@/lib/family/repository";
import type { FamilyApplication } from "@/lib/family-applications";

export async function PUT(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { applications?: FamilyApplication[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!Array.isArray(body.applications)) {
    return jsonError("Liste de demandes manquante.", 400);
  }

  const bundle = await persistApplications(auth.user.id, body.applications);
  if (!bundle) return jsonError("Compte introuvable.", 404);
  return jsonOk({ bundle });
}
