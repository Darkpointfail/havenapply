/**
 * Server-side identity store: credentials, sessions, staff memberships,
 * invitations, rate-limit counters and audit events.
 *
 * Filesystem-backed for the local backend (`.data/identity/state.json`). In
 * Supabase mode the credential and session lifecycle belongs to Supabase Auth;
 * this store still owns memberships, invitations, rate limits and audit.
 *
 * Server-only: importing node:fs makes this unusable from a client component,
 * and no `"use client"` module may import it.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { UserRole } from "@/lib/auth-store";

const ROOT = path.join(process.cwd(), ".data", "identity");
const STATE_FILE = path.join(ROOT, "state.json");

export type CredentialRecord = {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerifiedAt: string | null;
  /** Hashed, single-use, expiring. */
  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  resetTokenHash: string | null;
  resetExpiresAt: string | null;
  resetUsedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  jti: string;
  userId: string;
  role: UserRole;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  /** Rotation chain: the session this one replaced. */
  rotatedFrom: string | null;
  userAgentHash: string | null;
};

export type StaffMembershipRecord = {
  id: string;
  userId: string;
  email: string;
  siteId: string;
  role: "admin" | "manager" | "coordinator" | "readonly";
  status: "active" | "suspended";
  createdAt: string;
};

export type StaffInvitationRecord = {
  id: string;
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  invitedByUserId: string;
  createdAt: string;
};

export type AuditEventRecord = {
  id: string;
  at: string;
  event: string;
  actorId: string | null;
  /** Never the raw address or email: hashed for correlation only. */
  subjectHash: string | null;
  outcome: "success" | "failure";
  metadata: Record<string, unknown>;
};

export type RateLimitRecord = {
  key: string;
  windowStartedAt: number;
  count: number;
};

type IdentityState = {
  credentials: CredentialRecord[];
  sessions: SessionRecord[];
  memberships: StaffMembershipRecord[];
  invitations: StaffInvitationRecord[];
  audit: AuditEventRecord[];
  rateLimits: RateLimitRecord[];
};

const EMPTY: IdentityState = {
  credentials: [],
  sessions: [],
  memberships: [],
  invitations: [],
  audit: [],
  rateLimits: [],
};

function nowIso() {
  return new Date().toISOString();
}

export function hashLookup(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function readState(): Promise<IdentityState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<IdentityState>;
    return {
      credentials: parsed.credentials ?? [],
      sessions: parsed.sessions ?? [],
      memberships: parsed.memberships ?? [],
      invitations: parsed.invitations ?? [],
      audit: parsed.audit ?? [],
      rateLimits: parsed.rateLimits ?? [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeState(state: IdentityState) {
  await fs.mkdir(ROOT, { recursive: true, mode: 0o700 });
  const tmp = `${STATE_FILE}.tmp-${randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, STATE_FILE);
}

/** Serialize writes: concurrent handlers in one process must not clobber. */
let chain: Promise<unknown> = Promise.resolve();
function withState<T>(fn: (state: IdentityState) => Promise<T> | T): Promise<T> {
  const run = chain.then(async () => {
    const state = await readState();
    const result = await fn(state);
    await writeState(state);
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export async function findCredentialByEmail(email: string): Promise<CredentialRecord | null> {
  const state = await readState();
  const needle = email.trim().toLowerCase();
  return state.credentials.find((c) => c.email === needle) ?? null;
}

export async function findCredentialById(userId: string): Promise<CredentialRecord | null> {
  const state = await readState();
  return state.credentials.find((c) => c.userId === userId) ?? null;
}

export async function createCredential(input: {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  verificationTokenHash?: string | null;
  verificationExpiresAt?: string | null;
  emailVerifiedAt?: string | null;
}): Promise<{ ok: true; record: CredentialRecord } | { ok: false; error: string }> {
  return withState((state) => {
    const email = input.email.trim().toLowerCase();
    if (state.credentials.some((c) => c.email === email)) {
      return { ok: false as const, error: "An account already exists for this email." };
    }
    const at = nowIso();
    const record: CredentialRecord = {
      userId: `usr_${randomUUID()}`,
      email,
      passwordHash: input.passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      verificationTokenHash: input.verificationTokenHash ?? null,
      verificationExpiresAt: input.verificationExpiresAt ?? null,
      resetTokenHash: null,
      resetExpiresAt: null,
      resetUsedAt: null,
      disabledAt: null,
      createdAt: at,
      updatedAt: at,
    };
    state.credentials.push(record);
    return { ok: true as const, record };
  });
}

export async function updateCredential(
  userId: string,
  patch: Partial<Omit<CredentialRecord, "userId" | "createdAt">>,
): Promise<CredentialRecord | null> {
  return withState((state) => {
    const index = state.credentials.findIndex((c) => c.userId === userId);
    if (index < 0) return null;
    const next = { ...state.credentials[index], ...patch, updatedAt: nowIso() };
    state.credentials[index] = next;
    return next;
  });
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(input: {
  userId: string;
  role: UserRole;
  ttlMs: number;
  rotatedFrom?: string | null;
  userAgentHash?: string | null;
}): Promise<SessionRecord> {
  return withState((state) => {
    const issued = Date.now();
    const record: SessionRecord = {
      jti: `ses_${randomUUID()}`,
      userId: input.userId,
      role: input.role,
      issuedAt: new Date(issued).toISOString(),
      expiresAt: new Date(issued + input.ttlMs).toISOString(),
      revokedAt: null,
      rotatedFrom: input.rotatedFrom ?? null,
      userAgentHash: input.userAgentHash ?? null,
    };
    state.sessions.push(record);
    // Bound growth: keep the 500 most recent sessions.
    if (state.sessions.length > 500) {
      state.sessions = state.sessions.slice(-500);
    }
    return record;
  });
}

export async function getSession(jti: string): Promise<SessionRecord | null> {
  const state = await readState();
  return state.sessions.find((s) => s.jti === jti) ?? null;
}

export async function revokeSession(jti: string): Promise<void> {
  await withState((state) => {
    const index = state.sessions.findIndex((s) => s.jti === jti);
    if (index >= 0 && !state.sessions[index].revokedAt) {
      state.sessions[index] = { ...state.sessions[index], revokedAt: nowIso() };
    }
  });
}

/** Used on password change and on demand: every device is signed out. */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  return withState((state) => {
    let count = 0;
    state.sessions = state.sessions.map((s) => {
      if (s.userId === userId && !s.revokedAt) {
        count += 1;
        return { ...s, revokedAt: nowIso() };
      }
      return s;
    });
    return count;
  });
}

// ---------------------------------------------------------------------------
// Staff memberships and invitations
// ---------------------------------------------------------------------------

export async function listMembershipsByUser(userId: string): Promise<StaffMembershipRecord[]> {
  const state = await readState();
  return state.memberships.filter((m) => m.userId === userId && m.status === "active");
}

export async function upsertMembership(input: {
  userId: string;
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
}): Promise<StaffMembershipRecord> {
  return withState((state) => {
    const existing = state.memberships.find(
      (m) => m.userId === input.userId && m.siteId === input.siteId,
    );
    if (existing) {
      const next = { ...existing, role: input.role, status: "active" as const };
      state.memberships = state.memberships.map((m) => (m.id === existing.id ? next : m));
      return next;
    }
    const record: StaffMembershipRecord = {
      id: `mem_${randomUUID()}`,
      userId: input.userId,
      email: input.email.trim().toLowerCase(),
      siteId: input.siteId,
      role: input.role,
      status: "active",
      createdAt: nowIso(),
    };
    state.memberships.push(record);
    return record;
  });
}

export async function setMembershipStatus(
  membershipId: string,
  status: StaffMembershipRecord["status"],
): Promise<StaffMembershipRecord | null> {
  return withState((state) => {
    const index = state.memberships.findIndex((m) => m.id === membershipId);
    if (index < 0) return null;
    const next = { ...state.memberships[index], status };
    state.memberships[index] = next;
    return next;
  });
}

export async function createInvitation(input: {
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
  tokenHash: string;
  ttlMs: number;
  invitedByUserId: string;
}): Promise<StaffInvitationRecord> {
  return withState((state) => {
    const record: StaffInvitationRecord = {
      id: `inv_${randomUUID()}`,
      email: input.email.trim().toLowerCase(),
      siteId: input.siteId,
      role: input.role,
      tokenHash: input.tokenHash,
      expiresAt: new Date(Date.now() + input.ttlMs).toISOString(),
      usedAt: null,
      revokedAt: null,
      invitedByUserId: input.invitedByUserId,
      createdAt: nowIso(),
    };
    state.invitations.push(record);
    return record;
  });
}

/** Single use: the first successful consumption marks the token spent. */
export async function consumeInvitation(
  tokenHash: string,
): Promise<{ ok: true; record: StaffInvitationRecord } | { ok: false; error: string }> {
  return withState((state) => {
    const index = state.invitations.findIndex((i) => i.tokenHash === tokenHash);
    if (index < 0) return { ok: false as const, error: "Invitation not found." };

    const invitation = state.invitations[index];
    if (invitation.revokedAt) return { ok: false as const, error: "Invitation revoked." };
    if (invitation.usedAt) return { ok: false as const, error: "Invitation already used." };
    if (Date.parse(invitation.expiresAt) < Date.now()) {
      return { ok: false as const, error: "Invitation expired." };
    }

    const used = { ...invitation, usedAt: nowIso() };
    state.invitations[index] = used;
    return { ok: true as const, record: used };
  });
}

export async function revokeInvitation(id: string): Promise<void> {
  await withState((state) => {
    const index = state.invitations.findIndex((i) => i.id === id);
    if (index >= 0) state.invitations[index] = { ...state.invitations[index], revokedAt: nowIso() };
  });
}

// ---------------------------------------------------------------------------
// Rate limiting (persistent, fixed window)
// ---------------------------------------------------------------------------

export type RateLimitVerdict = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  return withState((state) => {
    const now = Date.now();
    state.rateLimits = state.rateLimits.filter((r) => now - r.windowStartedAt < windowMs * 4);

    const index = state.rateLimits.findIndex((r) => r.key === key);
    if (index < 0) {
      state.rateLimits.push({ key, windowStartedAt: now, count: 1 });
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    const record = state.rateLimits[index];
    if (now - record.windowStartedAt >= windowMs) {
      state.rateLimits[index] = { key, windowStartedAt: now, count: 1 };
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    const count = record.count + 1;
    state.rateLimits[index] = { ...record, count };
    if (count > limit) {
      const retryAfterSeconds = Math.ceil((record.windowStartedAt + windowMs - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    return { allowed: true, remaining: limit - count, retryAfterSeconds: 0 };
  });
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export async function recordAuditEvent(input: {
  event: string;
  actorId?: string | null;
  subject?: string | null;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}): Promise<AuditEventRecord> {
  return withState((state) => {
    const record: AuditEventRecord = {
      id: `evt_${randomUUID()}`,
      at: nowIso(),
      event: input.event,
      actorId: input.actorId ?? null,
      subjectHash: input.subject ? hashLookup(input.subject) : null,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
    };
    state.audit.push(record);
    if (state.audit.length > 5000) state.audit = state.audit.slice(-5000);
    return record;
  });
}

export async function listAuditEvents(limit = 100): Promise<AuditEventRecord[]> {
  const state = await readState();
  return state.audit.slice(-limit).reverse();
}

/** Tests only. */
export async function __resetIdentityForTests() {
  await writeState(structuredClone(EMPTY));
}
