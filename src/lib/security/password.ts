/**
 * Server-side password hashing.
 *
 * scrypt from node:crypto — memory-hard, no new dependency. Replaces the
 * single-round SHA-256 that ran in the browser.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// ~64 MB of memory per hash: costly to brute-force, tolerable per login.
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const KEYLEN = 64;
const SALT_BYTES = 16;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordPolicyResult = { ok: true } | { ok: false; error: string };

export function checkPasswordPolicy(password: unknown): PasswordPolicyResult {
  if (typeof password !== "string") return { ok: false, error: "Invalid password." };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: "Password is too long." };
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (classes < 3) {
    return {
      ok: false,
      error: "Password must mix lower case, upper case, digits or symbols.",
    };
  }
  return { ok: true };
}

/** Encoded as `scrypt$N$r$p$saltB64$hashB64` so parameters can evolve. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEYLEN, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = encoded.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: PARAMS.maxmem,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Constant-ish work for unknown accounts so response time does not reveal
 * whether an email exists.
 */
export async function dummyVerify(): Promise<void> {
  const salt = randomBytes(SALT_BYTES);
  await scrypt("invalid-password-placeholder", salt, KEYLEN, PARAMS);
}

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
