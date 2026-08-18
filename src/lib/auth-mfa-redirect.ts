/** Helpers for post-login MFA redirects (client). */

export type MfaRedirectKind = "challenge" | "enroll" | "suggest_enroll";

export function mfaRedirectPath(
  kind: MfaRedirectKind,
  opts?: { factorId?: string; next?: string },
): string {
  const next = encodeURIComponent(opts?.next || "/");
  if (kind === "challenge") {
    const factor = opts?.factorId ? `&factorId=${encodeURIComponent(opts.factorId)}` : "";
    return `/security/mfa/challenge?next=${next}${factor}`;
  }
  if (kind === "enroll" || kind === "suggest_enroll") {
    return `/security/mfa/enroll?next=${next}`;
  }
  return opts?.next || "/";
}
