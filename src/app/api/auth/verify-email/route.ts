import { jsonError, jsonOk } from "@/lib/family/authz";
import { verifyEmailToken } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const result = await verifyEmailToken(body.token, await requestFingerprint());
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ verified: true });
}
