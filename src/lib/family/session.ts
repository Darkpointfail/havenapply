/**
 * Signed session cookie for local (non-Supabase) auth so family APIs can
 * authorize server-side. Never trusts a client-supplied user id alone.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SessionUser, UserRole } from "@/lib/auth-store";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { requireSessionSecret } from "@/lib/security/env";

export const FAMILY_SESSION_COOKIE = "haven-family-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * One signing secret for the whole application. This cookie used to fall back
 * to the Supabase service-role key and then to a literal in the repository:
 * the first couples session integrity to a high-privilege credential, the
 * second is not a secret at all.
 */
function sessionSecret() {
  return requireSessionSecret();
}

function b64url(buf: Buffer | string) {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function sign(payloadB64: string) {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

export type FamilySessionPayload = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  onboardingCompleted: boolean;
  exp: number;
};

export function mintFamilySessionToken(user: SessionUser): string {
  const payload: FamilySessionPayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    onboardingCompleted: user.onboardingCompleted,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyFamilySessionToken(token: string | undefined | null): FamilySessionPayload | null {
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
    const raw = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as FamilySessionPayload;
    if (!raw?.id || !raw?.email || !raw?.exp) return null;
    if (Date.now() > raw.exp) return null;
    const role = parseUserRole(raw.role);
    if (!role) return null;
    return { ...raw, role };
  } catch {
    return null;
  }
}

export function sessionUserFromPayload(p: FamilySessionPayload): SessionUser {
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`.trim(),
    role: p.role,
    phone: p.phone,
    emailConfirmed: true,
    onboardingCompleted: p.onboardingCompleted,
  };
}

export function newOpaqueId(prefix = "id") {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

export function familySessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Whether this deployment should use the local signed cookie session. */
export function usesLocalFamilySession() {
  return !isSupabaseBackend();
}
