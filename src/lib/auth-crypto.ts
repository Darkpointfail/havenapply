/**
 * Local-prototype password hashing.
 * Production MUST use Supabase Auth (server-side bcrypt via GoTrue).
 * Local path uses PBKDF2-SHA-256 (210k iterations) as a stronger interim than plain SHA-256.
 */

import { isValidPassword as policyValid } from "@/lib/auth-password-policy";

function toHex(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export function createToken() {
  // 32 bytes → 64 hex chars; short-lived one-time tokens for local confirm/reset.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

const PBKDF2_ITERATIONS = 210_000;

export async function hashPassword(password: string, salt: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toHex(derived)}`;
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  // Legacy local SHA-256 hashes (pre-hardening)
  if (!hash.startsWith("pbkdf2-sha256$")) {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toHex(digest) === hash;
  }
  const next = await hashPassword(password, salt);
  return next === hash;
}

/** Re-export policy so existing imports keep working. */
export function isValidPassword(password: string) {
  return policyValid(password);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export { PASSWORD_MIN_LENGTH } from "@/lib/auth-password-policy";
