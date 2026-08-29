import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { requestDeletion } from "@/lib/family/repository";

export async function POST(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { scope?: "profile" | "account"; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Requête invalide.", 400);
  }

  const scope = body.scope === "profile" ? "profile" : "account";
  const bundle = await requestDeletion(auth.user.id, {
    scope,
    reason: body.reason,
  });
  if (!bundle) return jsonError("Impossible d'enregistrer la demande.", 404);
  return jsonOk({ bundle });
}
