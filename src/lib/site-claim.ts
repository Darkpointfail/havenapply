import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/env";

const CLAIM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString("base64url");
}

function sign(payloadB64: string) {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(payloadB64).digest("base64url");
}

/**
 * Signed site claim for deep-link "Faire une demande".
 * Client cannot substitute another siteId by editing the URL — server verifies HMAC.
 */
export function createSiteClaim(siteId: string, ttlMs = CLAIM_TTL_MS): string {
  const payload = b64url(
    JSON.stringify({ siteId, exp: Date.now() + ttlMs }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySiteClaim(token: string): { siteId: string } | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      siteId?: string;
      exp?: number;
    };
    if (!parsed.siteId || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return { siteId: parsed.siteId };
  } catch {
    return null;
  }
}
