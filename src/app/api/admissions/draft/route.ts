import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor } from "@/lib/admissions/authz";
import { saveDraft } from "@/lib/admissions/repository";
import { parseSubmitInput, readJson } from "@/lib/admissions/validation";

/** Upsert a family draft. Drafts are never returned to residence staff. */
export async function POST(request: Request) {
  const auth = await requireFamilyActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const parsed = parseSubmitInput(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const result = await saveDraft({
    familyUserId: auth.actor.userId,
    familyEmail: auth.actor.email,
    input: parsed.value,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  return jsonOk({ application: result.data });
}
