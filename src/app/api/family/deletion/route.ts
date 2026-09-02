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
    return jsonError("Invalid request.", 400);
  }

  const scope = body.scope === "profile" ? "profile" : "account";

  if (body.confirmExecute) {
    const accountPhrases = new Set(["DELETE MY ACCOUNT", "SUPPRIMER MON COMPTE"]);
    const profilePhrases = new Set(["DELETE THE FILE", "SUPPRIMER LE DOSSIER"]);
    const allowed = scope === "account" ? accountPhrases : profilePhrases;
    const phrase = body.confirmPhrase?.trim() || "";
    if (!allowed.has(phrase)) {
      return jsonError(
        scope === "account"
          ? "To confirm, type exactly: DELETE MY ACCOUNT"
          : "To confirm, type exactly: DELETE THE FILE",
        400,
      );
    }
    const result = await executeDeletion(auth.user.id, {
      scope,
      reason: body.reason,
    });
    if (!result) return jsonError("Unable to complete deletion.", 404);
    return jsonOk({
      executed: true,
      scope: result.scope,
      message:
        scope === "account"
          ? "Your family data has been deleted from this space."
          : "The senior's file has been erased.",
    });
  }

  const bundle = await requestDeletion(auth.user.id, {
    scope,
    reason: body.reason,
  });
  if (!bundle) return jsonError("Unable to save the request.", 404);
  await recordRightsOperation(auth.user.id, "deletion_request", `Scope ${scope}`);
  return jsonOk({ bundle, executed: false });
}
