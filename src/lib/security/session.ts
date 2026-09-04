/**
 * Session tokens bound to a server-side session record.
 *
 * The cookie carries only a session id (`jti`) plus a signature. Identity,
 * role and expiry come from the server record, so a tampered or replayed
 * cookie cannot promote a caller: revoking the record kills the cookie.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/lib/auth-store";
import { requireSessionSecret } from "@/lib/security/env";
import {
  createSession,
  getSession,
  revokeSession,
  type SessionRecord,
} from "@/lib/security/identity-store";

export const SESSION_COOKIE = "haven_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
export const SESSION_ABSOLUTE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function sign(value: string) {
  return createHmac("sha256", requireSessionSecret()).update(value).digest("base64url");
}

export function encodeSessionToken(jti: string): string {
  return `${jti}.${sign(jti)}`;
}

/** Signature check only — the record still has to be loaded and validated. */
export function decodeSessionToken(token: string | undefined | null): string | null {
  if (!token || !token.includes(".")) return null;
  const separator = token.lastIndexOf(".");
  const jti = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!jti || !signature) return null;

  try {
    const provided = Buffer.from(signature);
    const expected = Buffer.from(sign(jti));
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  } catch {
    return null;
  }
  return jti;
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function issueSession(input: {
  userId: string;
  role: UserRole;
  userAgentHash?: string | null;
  rotatedFrom?: string | null;
}): Promise<{ record: SessionRecord; token: string }> {
  const record = await createSession({
    userId: input.userId,
    role: input.role,
    ttlMs: SESSION_TTL_MS,
    rotatedFrom: input.rotatedFrom ?? null,
    userAgentHash: input.userAgentHash ?? null,
  });
  return { record, token: encodeSessionToken(record.jti) };
}

export type ResolvedSession = { record: SessionRecord };

/** Signature, existence, revocation and expiry are all checked server-side. */
export async function resolveSession(token: string | undefined | null): Promise<ResolvedSession | null> {
  const jti = decodeSessionToken(token);
  if (!jti) return null;

  const record = await getSession(jti);
  if (!record) return null;
  if (record.revokedAt) return null;
  if (Date.parse(record.expiresAt) <= Date.now()) return null;
  if (Date.parse(record.issuedAt) + SESSION_ABSOLUTE_TTL_MS <= Date.now()) return null;

  return { record };
}

/** Rotate on privilege-relevant events: the previous id stops working at once. */
export async function rotateSession(current: SessionRecord): Promise<{ token: string }> {
  const { token } = await issueSession({
    userId: current.userId,
    role: current.role,
    userAgentHash: current.userAgentHash,
    rotatedFrom: current.jti,
  });
  await revokeSession(current.jti);
  return { token };
}
