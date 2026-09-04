import type { SessionUser } from "@/lib/auth-store";
import { requireFamily } from "@/lib/security/guards";

export type AuthzFailure = { ok: false; status: number; error: string };
export type AuthzOk = { ok: true; user: SessionUser };
export type AuthzResult = AuthzOk | AuthzFailure;

/**
 * Family identity for the family APIs.
 *
 * Delegates to the central guard: the session id in the cookie is resolved
 * against a server record, and the role is read from the credential row —
 * never from anything the browser sent.
 */
export async function requireFamilyUser(): Promise<AuthzResult> {
  const guard = await requireFamily();
  if (!guard.ok) return guard;

  const { principal } = guard;
  const [firstName = "", ...rest] = principal.displayName.split(" ");
  return {
    ok: true,
    user: {
      id: principal.userId,
      email: principal.email,
      firstName,
      lastName: rest.join(" "),
      name: principal.displayName,
      role: principal.role,
      emailConfirmed: true,
      onboardingCompleted: true,
    },
  };
}

export function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
