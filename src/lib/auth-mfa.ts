/**
 * Supabase Auth MFA (TOTP) helpers.
 * Supabase/GoTrue remains the IdP — this is a thin client wrapper + policy.
 */

import type { UserRole } from "@/lib/auth-store";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBackend } from "@/lib/supabase/config";

export type AalLevel = "aal1" | "aal2";

/** MFA mandatory for professionals, community staff, and platform internal admins. */
export function roleRequiresMfa(role: UserRole): boolean {
  return (
    role === "professional" ||
    role === "facility" ||
    role === "community" ||
    role === "internal"
  );
}

/** Families are offered MFA but not blocked without it. */
export function roleSuggestsMfa(role: UserRole): boolean {
  return role === "family";
}

export async function getMfaAssurance(): Promise<{
  currentLevel: AalLevel | null;
  nextLevel: AalLevel | null;
}> {
  if (!isSupabaseBackend()) {
    return { currentLevel: "aal1", nextLevel: null };
  }
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return {
    currentLevel: (data.currentLevel as AalLevel) || null,
    nextLevel: (data.nextLevel as AalLevel) || null,
  };
}

export async function listMfaFactors() {
  if (!isSupabaseBackend()) return { totp: [] as { id: string; friendly_name?: string }[] };
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { totp: [] };
  return {
    totp: (data.totp || []).map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name || undefined,
    })),
  };
}

export async function enrollTotp(friendlyName = "HavenApply Authenticator") {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error || !data) return { ok: false as const, error: error?.message || "enroll_failed" };
  return {
    ok: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function challengeAndVerifyTotp(input: {
  factorId: string;
  code: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: input.factorId,
    code: input.code.replace(/\s/g, ""),
  });
  if (error || !data) return { ok: false as const, error: error?.message || "verify_failed" };
  return { ok: true as const };
}

export async function unenrollMfaFactor(factorId: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * After password auth: decide next security step.
 * - challenge: TOTP required to reach AAL2
 * - enroll: role mandates MFA but no factor yet
 * - ok: proceed
 */
export async function resolvePostLoginMfa(role: UserRole): Promise<
  | { status: "ok" }
  | { status: "challenge"; factorId: string }
  | { status: "enroll" }
  | { status: "suggest_enroll" }
> {
  if (!isSupabaseBackend()) {
    // Local prototype cannot enforce TOTP; production must use Supabase.
    return { status: "ok" };
  }

  const factors = await listMfaFactors();
  const aal = await getMfaAssurance();
  const hasTotp = factors.totp.length > 0;

  if (hasTotp && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return { status: "challenge", factorId: factors.totp[0]!.id };
  }

  if (roleRequiresMfa(role) && !hasTotp) {
    return { status: "enroll" };
  }

  if (roleSuggestsMfa(role) && !hasTotp) {
    return { status: "suggest_enroll" };
  }

  if (roleRequiresMfa(role) && aal.currentLevel !== "aal2" && hasTotp) {
    return { status: "challenge", factorId: factors.totp[0]!.id };
  }

  return { status: "ok" };
}
