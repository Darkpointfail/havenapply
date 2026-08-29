import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import {
  executeDeletion,
  getRightsLog,
  requestDeletion,
  recordRightsOperation,
} from "@/lib/family/repository";

/**
 * POST: request deletion (pending) or execute deletion when confirmExecute=true.
 * GET: list recent rights operation logs for the authenticated user.
 */
export async function GET() {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const logs = await getRightsLog(auth.user.id);
  return jsonOk({ logs });
}

export async function POST(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: {
    scope?: "profile" | "account";
    reason?: string;
    confirmExecute?: boolean;
    confirmPhrase?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Requête invalide.", 400);
  }

  const scope = body.scope === "profile" ? "profile" : "account";

  if (body.confirmExecute) {
    const expected = scope === "account" ? "SUPPRIMER MON COMPTE" : "SUPPRIMER LE DOSSIER";
    if (body.confirmPhrase?.trim() !== expected) {
      return jsonError(
        `Pour confirmer, saisissez exactement : ${expected}`,
        400,
      );
    }
    const result = await executeDeletion(auth.user.id, {
      scope,
      reason: body.reason,
    });
    if (!result) return jsonError("Impossible d'exécuter la suppression.", 404);
    return jsonOk({
      executed: true,
      scope: result.scope,
      message:
        scope === "account"
          ? "Vos données familiales ont été supprimées de cet espace."
          : "Le dossier de la personne aînée a été effacé.",
    });
  }

  const bundle = await requestDeletion(auth.user.id, {
    scope,
    reason: body.reason,
  });
  if (!bundle) return jsonError("Impossible d'enregistrer la demande.", 404);
  await recordRightsOperation(auth.user.id, "deletion_request", `Portée ${scope}`);
  return jsonOk({ bundle, executed: false });
}
