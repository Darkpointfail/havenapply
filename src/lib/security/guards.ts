/**
 * Centralised server guards: FAMILY, STAFF, ADMIN.
 *
 * Every protected route goes through one of these. Nothing in the request body
 * or query can change who the caller is, which family they own, or which sites
 * they may read.
 */

import { cookies, headers } from "next/headers";
import type { SessionUser, UserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sessionFromSupabaseUser } from "@/lib/auth-supabase";
import {
  findCredentialById,
  listMembershipsByUser,
  recordAuditEvent,
  type StaffMembershipRecord,
} from "@/lib/security/identity-store";
import { SESSION_COOKIE, resolveSession } from "@/lib/security/session";
import { CSRF_COOKIE, verifyCsrf } from "@/lib/security/csrf";

export type GuardFailure = { ok: false; status: number; error: string };

export type Principal = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  sessionId: string | null;
};

export type StaffPrincipal = Principal & {
  siteIds: string[];
  memberships: StaffMembershipRecord[];
};

export type GuardResult<T> = { ok: true; principal: T } | GuardFailure;

const UNAUTHENTICATED: GuardFailure = {
  ok: false,
  status: 401,
  error: "Session expired. Please sign in again.",
};

/** Resolve the caller with no role expectation. */
export async function currentPrincipal(): Promise<Principal | null> {
  if (isSupabaseBackend()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const sessionUser: SessionUser | null = sessionFromSupabaseUser(user);
      if (!sessionUser) return null;
      return {
        userId: sessionUser.id,
        email: sessionUser.email,
        displayName: sessionUser.name || sessionUser.email,
        role: sessionUser.role,
        sessionId: null,
      };
    } catch {
      return null;
    }
  }

  const jar = await cookies();
  const resolved = await resolveSession(jar.get(SESSION_COOKIE)?.value);
  if (!resolved) return null;

  // Role comes from the credential record, not from the cookie payload.
  const credential = await findCredentialById(resolved.record.userId);
  if (!credential || credential.disabledAt) return null;

  return {
    userId: credential.userId,
    email: credential.email,
    displayName: `${credential.firstName} ${credential.lastName}`.trim() || credential.email,
    role: credential.role,
    sessionId: resolved.record.jti,
  };
}

function isFamily(role: UserRole) {
  return role === "family";
}

function isStaff(role: UserRole) {
  return role === "facility" || role === "community";
}

function isAdmin(role: UserRole) {
  return role === "internal";
}

export async function requireFamily(): Promise<GuardResult<Principal>> {
  const principal = await currentPrincipal();
  if (!principal) return UNAUTHENTICATED;
  if (!isFamily(principal.role)) {
    return { ok: false, status: 403, error: "Access reserved for family accounts." };
  }
  return { ok: true, principal };
}

export async function requireAdmin(): Promise<GuardResult<Principal>> {
  const principal = await currentPrincipal();
  if (!principal) return UNAUTHENTICATED;
  if (!isAdmin(principal.role)) {
    return { ok: false, status: 403, error: "Access reserved for administrators." };
  }
  return { ok: true, principal };
}

/**
 * Staff identity plus the sites they may act on, read from the membership
 * table. An account with no active membership is refused.
 */
export async function requireStaff(): Promise<GuardResult<StaffPrincipal>> {
  const principal = await currentPrincipal();
  if (!principal) return UNAUTHENTICATED;
  if (!isStaff(principal.role)) {
    return { ok: false, status: 403, error: "Access reserved for residence accounts." };
  }

  const memberships = await listMembershipsByUser(principal.userId);
  const siteIds = [...new Set(memberships.map((m) => m.siteId))];
  if (siteIds.length === 0) {
    return { ok: false, status: 403, error: "No residence is linked to this account." };
  }

  return { ok: true, principal: { ...principal, siteIds, memberships } };
}

/** Narrow a staff principal to one site; widening is refused. */
export function scopeToSite(
  principal: StaffPrincipal,
  requestedSiteId: string | null,
): { ok: true; siteIds: string[] } | GuardFailure {
  if (!requestedSiteId) return { ok: true, siteIds: principal.siteIds };
  if (!principal.siteIds.includes(requestedSiteId)) {
    return { ok: false, status: 403, error: "This residence is not linked to your account." };
  }
  return { ok: true, siteIds: [requestedSiteId] };
}

/** Origin + double-submit check. Call first in every mutating handler. */
export async function requireCsrf(request: Request): Promise<{ ok: true } | GuardFailure> {
  const jar = await cookies();
  const verdict = verifyCsrf(request, jar.get(CSRF_COOKIE)?.value);
  if (verdict.ok) return { ok: true };

  await recordAuditEvent({
    event: "csrf.rejected",
    outcome: "failure",
    metadata: { path: new URL(request.url).pathname },
  });
  return verdict;
}

/** Coarse client fingerprint for rate-limit keys. Never logged raw. */
export async function requestFingerprint(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  return ip;
}
