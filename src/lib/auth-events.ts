/**
 * Auth security event log (server-only). No passwords, tokens, or raw secrets.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthEventType =
  | "sign_in_success"
  | "sign_in_failure"
  | "sign_out"
  | "password_change"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enroll"
  | "mfa_challenge_success"
  | "mfa_challenge_failure"
  | "session_revoked"
  | "rate_limited"
  | "csrf_rejected"
  | "anomaly_alert";

export type AuthEvent = {
  id: string;
  createdAt: string;
  type: AuthEventType;
  role?: string | null;
  userIdHash?: string | null;
  emailHash?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  detail?: string | null;
};

const RETENTION_DAYS = 90;

function dataFile() {
  return path.join(process.cwd(), ".data", "auth-events.json");
}

async function ensureDir() {
  await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
}

function prune(events: AuthEvent[], now = new Date()): AuthEvent[] {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString();
  return events.filter((e) => e.createdAt >= cutoff);
}

export async function hashIdentifier(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const secret = process.env.ACCESS_LOG_HASH_SECRET || process.env.AUTH_EVENT_HASH_SECRET;
  if (!secret) {
    // Fallback one-way without secret (still not reversible plaintext email)
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(value.toLowerCase()).digest("hex");
  }
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(value.toLowerCase()).digest("hex");
}

export async function recordAuthEvent(input: {
  type: AuthEventType;
  role?: string | null;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      void fetch("/api/auth/security-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: input.type,
          detail: input.detail ?? null,
        }),
        credentials: "same-origin",
      });
    } catch {
      /* ignore */
    }
    return;
  }

  const event: AuthEvent = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    type: input.type,
    role: input.role ?? null,
    userIdHash: await hashIdentifier(input.userId),
    emailHash: await hashIdentifier(input.email),
    ipHash: await hashIdentifier(input.ip),
    userAgent: input.userAgent?.slice(0, 180) ?? null,
    detail: input.detail?.slice(0, 200) ?? null,
  };

  const admin = createAdminClient();
  if (admin) {
    const { error } = await admin.from("auth_security_events").insert({
      id: event.id,
      created_at: event.createdAt,
      event_type: event.type,
      role: event.role,
      user_id_hash: event.userIdHash,
      email_hash: event.emailHash,
      ip_hash: event.ipHash,
      user_agent: event.userAgent,
      detail: event.detail,
    });
    if (!error) {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
      void admin.from("auth_security_events").delete().lt("created_at", cutoff);
      return;
    }
  }

  await ensureDir();
  let existing: AuthEvent[] = [];
  try {
    existing = JSON.parse(await readFile(dataFile(), "utf8")) as AuthEvent[];
  } catch {
    existing = [];
  }
  existing = prune(existing);
  existing.unshift(event);
  await writeFile(dataFile(), JSON.stringify(existing.slice(0, 5000), null, 2), "utf8");
}

/** Simple anomaly: many failures for same IP hash within window. */
export async function detectAuthAnomaly(input: {
  ip?: string | null;
  failureThreshold?: number;
  windowMs?: number;
}): Promise<boolean> {
  const threshold = input.failureThreshold ?? 20;
  const windowMs = input.windowMs ?? 15 * 60 * 1000;
  const ipHash = await hashIdentifier(input.ip);
  if (!ipHash) return false;

  let events: AuthEvent[] = [];
  try {
    events = JSON.parse(await readFile(dataFile(), "utf8")) as AuthEvent[];
  } catch {
    return false;
  }
  const cutoff = Date.now() - windowMs;
  const failures = events.filter(
    (e) =>
      e.type === "sign_in_failure" &&
      e.ipHash === ipHash &&
      new Date(e.createdAt).getTime() >= cutoff,
  );
  if (failures.length >= threshold) {
    await recordAuthEvent({
      type: "anomaly_alert",
      ip: input.ip,
      detail: `sign_in_failure_burst:${failures.length}`,
    });
    return true;
  }
  return false;
}
