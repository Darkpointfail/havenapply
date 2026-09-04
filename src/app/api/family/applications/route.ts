import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { persistApplications } from "@/lib/family/repository";
import type { FamilyApplication } from "@/lib/family-applications";
import { requireCsrf } from "@/lib/security/guards";

export async function PUT(request: Request) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { applications?: FamilyApplication[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!Array.isArray(body.applications)) {
    return jsonError("Applications list is missing.", 400);
  }

  const bundle = await persistApplications(auth.user.id, body.applications);
  if (!bundle) return jsonError("Account not found.", 404);
  return jsonOk({ bundle });
}
