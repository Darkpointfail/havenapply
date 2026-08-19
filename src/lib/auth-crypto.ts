/**
 * Password hashing for the local/demo auth store only.
 * Uses Web Crypto PBKDF2-SHA-256 (standard KDF) — not a custom construction.
 * Production identity hashing is owned by Supabase Auth (GoTrue).
 */

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_PREFIX = "pbkdf2-sha256";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function pbkdf2Hash(password: string, saltHex: string, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(saltHex).buffer as ArrayBuffer,
      iterations,
    },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

/** Stored format: pbkdf2-sha256$<iterations>$<hex> */
export async function hashPassword(password: string, salt: string) {
  const digest = await pbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${digest}`;
}

function parseStoredHash(
  hash: string,
): { kind: "pbkdf2"; iterations: number; digest: string } | { kind: "legacy_sha256"; digest: string } {
  if (hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = hash.split("$");
    const iterations = Number(parts[1]);
    const digest = parts[2] || "";
    return { kind: "pbkdf2", iterations, digest };
  }
  return { kind: "legacy_sha256", digest: hash };
}

async function legacySha256(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify password. Legacy single-SHA-256 hashes are rejected in production;
 * in development they still verify so local demos can migrate on next password change.
 */
export async function verifyPassword(password: string, salt: string, hash: string) {
  const parsed = parseStoredHash(hash);
  if (parsed.kind === "pbkdf2") {
    const next = await pbkdf2Hash(password, salt, parsed.iterations);
    return timingSafeEqualHex(next, parsed.digest);
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const legacy = await legacySha256(password, salt);
  return timingSafeEqualHex(legacy, parsed.digest);
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
