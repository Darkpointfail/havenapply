/**
 * Download grant minting / verification (server).
 * Grants are short-lived HMAC tokens; elevated docs use shorter TTL + jti for single-use.
 */

import { isProductionRuntime, optionalSecret, requireSecret } from "@/lib/security/env";
import {
  DOWNLOAD_TTL_ELEVATED_SECONDS,
  DOWNLOAD_TTL_STANDARD_SECONDS,
} from "@/lib/security/storage-path";
import { mintSignedToken, verifySignedToken } from "@/lib/security/signed-token";

const usedJti = new Map<string, number>();

function signingSecret(): string {
  return requireSecret("DOWNLOAD_SIGNING_SECRET", {
    devFallback: "dev-only-download-signing-secret-rotate-me",
  });
}

function previousSigningSecret(): string | undefined {
  return optionalSecret("DOWNLOAD_SIGNING_SECRET_PREVIOUS");
}

function pruneUsed() {
  const now = Date.now();
  for (const [k, exp] of usedJti) {
    if (exp < now) usedJti.delete(k);
  }
}

export type DownloadGrantClaims = {
  typ: "doc_download";
  exp: number;
  iat: number;
  n: string;
  docId: string;
  elevated: boolean;
  jti: string;
  filename: string;
  mimeType?: string;
};

export async function mintDownloadGrant(opts: {
  documentId: string;
  elevated: boolean;
  filename: string;
  mimeType?: string;
}): Promise<{ token: string; expiresIn: number }> {
  const ttl = opts.elevated
    ? DOWNLOAD_TTL_ELEVATED_SECONDS
    : DOWNLOAD_TTL_STANDARD_SECONDS;
  const jtiBytes = new Uint8Array(16);
  crypto.getRandomValues(jtiBytes);
  const jti = Array.from(jtiBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const token = await mintSignedToken(
    signingSecret(),
    "doc_download",
    {
      docId: opts.documentId,
      elevated: opts.elevated,
      jti,
      filename: opts.filename,
      mimeType: opts.mimeType,
    },
    ttl,
  );
  return { token, expiresIn: ttl };
}

export async function consumeDownloadGrant(
  token: string,
): Promise<
  | { ok: true; claims: DownloadGrantClaims }
  | { ok: false; error: string }
> {
  pruneUsed();
  const result = await verifySignedToken<DownloadGrantClaims>(
    signingSecret(),
    token,
    "doc_download",
    previousSigningSecret(),
  );
  if (!result.ok) return result;

  const { body } = result;
  if (typeof body.docId !== "string" || typeof body.jti !== "string") {
    return { ok: false, error: "bad_claims" };
  }

  if (body.elevated || isProductionRuntime()) {
    if (usedJti.has(body.jti)) return { ok: false, error: "already_used" };
    usedJti.set(body.jti, body.exp);
  }

  return { ok: true, claims: body };
}
