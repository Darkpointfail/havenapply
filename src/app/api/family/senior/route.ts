import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { patchSenior } from "@/lib/family/repository";
import { validateSeniorPatchSafe } from "@/lib/family/validation";
import type { SeniorProfile } from "@/lib/senior-profile";
import { requireCsrf } from "@/lib/security/guards";

export async function PATCH(request: Request) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const seniorId = body.seniorId != null ? String(body.seniorId) : null;
  const onboardingStep =
    typeof body.onboardingStep === "number" ? body.onboardingStep : undefined;
  const patch = (body.patch || body) as Partial<SeniorProfile>;
  // strip control fields
  const { seniorId: _s, onboardingStep: _o, patch: _p, ...rest } = body as Record<string, unknown>;
  const data = (body.patch ? patch : rest) as Partial<SeniorProfile>;

  const err = validateSeniorPatchSafe(data as Record<string, unknown>);
  if (err) return jsonError(err, 400);

  const bundle = await patchSenior(auth.user.id, seniorId, data, {
    stepIndex: onboardingStep,
  });
  if (!bundle) return jsonError("Unable to save the profile.", 404);
  return jsonOk({ bundle });
}
