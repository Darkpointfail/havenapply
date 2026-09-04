/**
 * Signed staff session cookie so admissions APIs can resolve the residence a
 * staff member belongs to server-side. The client never states which site it
 * may read: only the membership store answers that.
 *
 * Retained only for signature verification of already-issued cookies; nothing
 * mints one any more — staff identity comes from the verified session.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const STAFF_SESSION_COOKIE = "haven-staff-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function sessionSecret() {
  return (
    process.env.HAVEN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "haven-local-dev-session-secret-change-me"
  );
}

function sign(payloadB64: string) {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

export type StaffSessionPayload = {
  userId: string;
  email: string;
  name: string;
  exp: number;
};

export function mintStaffSessionToken(input: {
  userId: string;
  email: string;
  name: string;
}): string {
  const payload: StaffSessionPayload = {
    userId: input.userId,
    email: input.email.toLowerCase(),
    name: input.name,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyStaffSessionToken(
  token: string | undefined | null,
): StaffSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(sign(payloadB64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const raw = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as StaffSessionPayload;
    if (!raw?.userId || !raw?.email || !raw?.exp) return null;
    if (Date.now() > raw.exp) return null;
    return raw;
  } catch {
    return null;
  }
}

export function staffSessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
