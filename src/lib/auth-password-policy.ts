/**
 * OWASP-aligned password policy shared by local + Supabase client checks.
 * Production password hashing is performed by Supabase Auth (bcrypt), not the browser.
 */

import { AUTH_MESSAGES } from "@/lib/auth-messages";

export const PASSWORD_MIN_LENGTH = 12;

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; error: string };

/** Complexity: length + mixed character classes (OWASP ASVS 2.1.x style). */
export function isValidPassword(password: string): boolean {
  if (typeof password !== "string") return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (password.length > 128) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  // Reject only-whitespace / common whitespace padding tricks
  if (password.trim().length < PASSWORD_MIN_LENGTH) return false;
  return true;
}

export function passwordPolicyError(password: string): string | null {
  if (isValidPassword(password)) return null;
  return AUTH_MESSAGES.weakPassword;
}

/**
 * Have I Been Pwned k-anonymity check (range API).
 * Sends only the first 5 chars of SHA-1(password); never the full password.
 * Fails open if the network/API is unavailable (does not block signup on outage).
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = await sha1Hex(password);
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5).toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined,
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hash, count] = line.trim().split(":");
      return hash?.toUpperCase() === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

export async function assertPasswordAllowed(
  password: string,
): Promise<PasswordPolicyResult> {
  if (!isValidPassword(password)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }
  if (await isPasswordPwned(password)) {
    return { ok: false, error: AUTH_MESSAGES.compromisedPassword };
  }
  return { ok: true };
}

async function sha1Hex(value: string): Promise<string> {
  // Web Crypto may not expose SHA-1 in all runtimes; Node crypto fallback for server/tests.
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-1", data);
      return bufferToHex(digest).toUpperCase();
    } catch {
      /* fall through */
    }
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha1").update(value).digest("hex").toUpperCase();
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
