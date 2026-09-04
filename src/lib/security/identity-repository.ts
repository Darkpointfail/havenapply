/**
 * Which identity adapter is in use, decided once and stated out loud.
 *
 * The local adapter stores identity in a JSON file under `.data/`. That is fine
 * for a developer machine and wrong everywhere else: the file is empty on a
 * fresh serverless instance, so a residence account would resolve no membership
 * and silently lose its scope. Rather than degrade, Supabase mode refuses to
 * touch the filesystem at all.
 *
 * `identityBackend()` is the single place that answers the question, so a route
 * never has to guess and a test can assert on the answer.
 */

import { isSupabaseBackend } from "@/lib/supabase/config";
import type { UserRole } from "@/lib/auth-store";
import type { RateLimitVerdict, StaffMembershipRecord } from "@/lib/security/identity-store";
import * as localStore from "@/lib/security/identity-store";
import * as supabaseStore from "@/lib/security/identity-supabase";

export type IdentityBackend = "local" | "supabase";

export function identityBackend(): IdentityBackend {
  return isSupabaseBackend() ? "supabase" : "local";
}

export function isSupabaseIdentity(): boolean {
  return identityBackend() === "supabase";
}

/**
 * Guard for the handful of operations that only the filesystem adapter offers,
 * such as reading a password hash. In Supabase mode GoTrue owns the credential,
 * so reaching one of these is a wiring mistake, not a condition to recover from.
 */
export function assertLocalIdentity(operation: string): void {
  if (isSupabaseIdentity()) {
    throw new Error(
      `${operation} is not available in Supabase mode: credentials live in Supabase Auth, not in the local identity store.`,
    );
  }
}

export type ResolvedIdentity = {
  userId: string;
  role: UserRole;
};

/** Memberships of the current session, from whichever adapter is configured. */
export async function listMembershipsForSession(
  userId: string,
): Promise<StaffMembershipRecord[]> {
  return isSupabaseIdentity()
    ? supabaseStore.listSessionMemberships(userId)
    : localStore.listMembershipsByUser(userId);
}

export async function upsertMembership(input: {
  userId: string;
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
}): Promise<StaffMembershipRecord> {
  return isSupabaseIdentity()
    ? supabaseStore.upsertMembership({
        userId: input.userId,
        siteId: input.siteId,
        role: input.role,
      })
    : localStore.upsertMembership(input);
}

export async function setMembershipStatus(
  membershipId: string,
  status: StaffMembershipRecord["status"],
): Promise<StaffMembershipRecord | null> {
  return isSupabaseIdentity()
    ? supabaseStore.setMembershipStatus(membershipId, status)
    : localStore.setMembershipStatus(membershipId, status);
}

export async function createInvitation(input: {
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
  tokenHash: string;
  ttlMs: number;
  invitedByUserId: string;
}): Promise<{ id: string; expiresAt: string }> {
  if (!isSupabaseIdentity()) {
    const record = await localStore.createInvitation(input);
    return { id: record.id, expiresAt: record.expiresAt };
  }

  // Only the hash is stored: an invitation table should not be a list of the
  // addresses a residence tried to recruit.
  return supabaseStore.createInvitation({
    emailHash: localStore.hashLookup(input.email),
    siteId: input.siteId,
    role: input.role,
    tokenHash: input.tokenHash,
    ttlMs: input.ttlMs,
    invitedByUserId: input.invitedByUserId,
  });
}

export async function recordAuditEvent(input: {
  event: string;
  actorId?: string | null;
  subject?: string | null;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseIdentity()) {
    await localStore.recordAuditEvent(input);
    return;
  }

  await supabaseStore.recordAuditEvent({
    event: input.event,
    actorId: input.actorId ?? null,
    subjectHash: input.subject ? localStore.hashLookup(input.subject) : null,
    outcome: input.outcome,
    metadata: input.metadata,
  });
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  return isSupabaseIdentity()
    ? supabaseStore.consumeRateLimit(key, limit, windowMs)
    : localStore.consumeRateLimit(key, limit, windowMs);
}
