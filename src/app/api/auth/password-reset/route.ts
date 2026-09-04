import { jsonError, jsonOk } from "@/lib/family/authz";
import { completePasswordReset, requestPasswordReset } from "@/lib/security/auth-service";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";

/** Request a reset link. Always answers 200 so accounts cannot be enumerated. */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const result = await requestPasswordReset(body.email, await requestFingerprint());
  if (!result.ok) return jsonError(result.error, result.status);

  const devToken = process.env.NODE_ENV === "production" ? undefined : result.data.token;
  return jsonOk({ sent: true, resetToken: devToken });
}

/** Consume the reset token: single use, expiring, revokes all sessions. */
export async function PUT(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: { token?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const result = await completePasswordReset({
    token: body.token,
    password: body.password,
    fingerprint: await requestFingerprint(),
  });
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ reset: true });
}
