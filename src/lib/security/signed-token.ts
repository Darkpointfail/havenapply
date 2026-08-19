/**
 * Short-lived, HMAC-signed capability tokens (download grants, site unlock).
 * Uses Web Crypto HMAC-SHA256 — no custom cipher design.
 */

import { decodePayload, encodePayload, hmacSign, hmacVerify } from "@/lib/security/hmac";

export type SignedTokenBody = {
  /** Token purpose */
  typ: string;
  /** Expiry unix ms */
  exp: number;
  /** Issued at unix ms */
  iat: number;
  /** Random nonce */
  n: string;
  /** Arbitrary claims */
  [key: string]: unknown;
};

function randomNonce(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function mintSignedToken(
  secret: string,
  typ: string,
  claims: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  const now = Date.now();
  const body: SignedTokenBody = {
    ...claims,
    typ,
    iat: now,
    exp: now + ttlSeconds * 1000,
    n: randomNonce(),
  };
  const payload = encodePayload(body);
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySignedToken<T extends SignedTokenBody>(
  secret: string,
  token: string,
  expectedTyp: string,
  /** Optional previous secret for rotation grace */
  previousSecret?: string,
): Promise<{ ok: true; body: T } | { ok: false; error: string }> {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "malformed" };
  const [payload, sig] = parts as [string, string];

  const secrets = [secret, previousSecret].filter(Boolean) as string[];
  let valid = false;
  for (const s of secrets) {
    if (await hmacVerify(s, payload, sig)) {
      valid = true;
      break;
    }
  }
  if (!valid) return { ok: false, error: "bad_signature" };

  const body = decodePayload<T>(payload);
  if (!body || typeof body.exp !== "number" || body.typ !== expectedTyp) {
    return { ok: false, error: "bad_payload" };
  }
  if (Date.now() > body.exp) return { ok: false, error: "expired" };
  return { ok: true, body };
}
