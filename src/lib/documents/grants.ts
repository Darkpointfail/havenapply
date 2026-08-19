/**
 * Short-lived HMAC download grants with tenant binding.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  DOCUMENT_SIGNED_URL_TTL_ELEVATED_SECONDS,
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
  isElevatedCategory,
} from "@/lib/documents/policy";

function signingSecret(): string {
  const s = process.env.DOWNLOAD_SIGNING_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DOWNLOAD_SIGNING_SECRET missing");
  }
  return "dev-only-download-signing-secret-rotate-me";
}

function previousSecret(): string | undefined {
  return process.env.DOWNLOAD_SIGNING_SECRET_PREVIOUS?.trim() || undefined;
}

export type DownloadGrant = {
  typ: "doc_dl";
  docId: string;
  tenantId: string;
  exp: number;
  iat: number;
  jti: string;
  elevated: boolean;
};

const usedJti = new Map<string, number>();

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(secret: string, payload: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

function verifySig(secret: string, payload: string, sig: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest();
  let got: Buffer;
  try {
    got = fromB64url(sig);
  } catch {
    return false;
  }
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

export function mintDownloadGrant(opts: {
  documentId: string;
  tenantId: string;
  category: string;
}): { token: string; expiresIn: number } {
  const elevated = isElevatedCategory(opts.category);
  const ttl = elevated
    ? DOCUMENT_SIGNED_URL_TTL_ELEVATED_SECONDS
    : DOCUMENT_SIGNED_URL_TTL_SECONDS;
  const now = Date.now();
  const body: DownloadGrant = {
    typ: "doc_dl",
    docId: opts.documentId,
    tenantId: opts.tenantId,
    iat: now,
    exp: now + ttl * 1000,
    jti: randomBytes(16).toString("hex"),
    elevated,
  };
  const payload = b64url(JSON.stringify(body));
  const token = `${payload}.${sign(signingSecret(), payload)}`;
  return { token, expiresIn: ttl };
}

export function consumeDownloadGrant(
  token: string,
  expectedTenantId: string,
): { ok: true; grant: DownloadGrant } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "malformed" };
  const [payload, sig] = parts as [string, string];
  const secrets = [signingSecret(), previousSecret()].filter(Boolean) as string[];
  if (!secrets.some((s) => verifySig(s, payload, sig))) {
    return { ok: false, error: "bad_signature" };
  }
  let grant: DownloadGrant;
  try {
    grant = JSON.parse(fromB64url(payload).toString("utf8")) as DownloadGrant;
  } catch {
    return { ok: false, error: "bad_payload" };
  }
  if (grant.typ !== "doc_dl") return { ok: false, error: "bad_typ" };
  if (Date.now() > grant.exp) return { ok: false, error: "expired" };
  if (grant.tenantId !== expectedTenantId) return { ok: false, error: "tenant_mismatch" };

  // Single-use for elevated; always single-use in production
  const singleUse = grant.elevated || process.env.NODE_ENV === "production";
  if (singleUse) {
    const now = Date.now();
    for (const [k, exp] of usedJti) if (exp < now) usedJti.delete(k);
    if (usedJti.has(grant.jti)) return { ok: false, error: "already_used" };
    usedJti.set(grant.jti, grant.exp);
  }

  return { ok: true, grant };
}
