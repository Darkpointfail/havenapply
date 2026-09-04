import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor } from "@/lib/admissions/authz";
import { submitApplication } from "@/lib/admissions/repository";
import { parseSubmitInput, readJson } from "@/lib/admissions/validation";
import { requireCsrf } from "@/lib/security/guards";

/**
 * Idempotent submission. Replaying the same `clientRequestId` for the same
 * family returns the existing record with 200 instead of creating a duplicate.
 */
export async function POST(request: Request) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const auth = await requireFamilyActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const parsed = parseSubmitInput(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const result = await submitApplication({
    familyUserId: auth.actor.userId,
    familyEmail: auth.actor.email,
    input: parsed.value,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  return jsonOk(
    { application: result.data.record, created: result.data.created },
    result.data.created ? 201 : 200,
  );
}
