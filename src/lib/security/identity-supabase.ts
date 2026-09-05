/**
 * Supabase-backed identity.
 *
 * The local adapter keeps identity in a JSON file keyed by `usr_<uuid>`. That
 * file does not exist on a serverless deployment, so in Supabase mode identity
 * has to come from the database, anchored on the `auth.users` UUID that GoTrue
 * already verified when it issued the caller's token.
 *
 * Two rules shape everything below:
 *
 *   * the role and the sites are read for `auth.uid()`, never for an identifier
 *     the caller supplied, and never by matching an email address;
 *   * reads run under the caller's own token, so row level security is what
 *     actually enforces the scope. The service role appears only where a write
 *     has no legitimate policy — issuing an invitation, granting the first
 *     membership, recording an audit line — and never leaves the server.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/auth-store";
import type { RateLimitVerdict, StaffMembershipRecord } from "@/lib/security/identity-store";

export type SupabaseIdentity = {
  userId: string;
  appRole: UserRole;
  status: "active" | "disabled";
};

/**
 * Privileged operations refuse to guess. If the deployment is in Supabase mode
 * without a service role key, the call fails loudly rather than falling back to
 * a filesystem that is not there.
 */
function adminClient() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "Supabase identity requires SUPABASE_SERVICE_ROLE_KEY on the server for privileged writes.",
    );
  }
  return admin;
}

function parseAppRole(value: unknown): UserRole | null {
  return value === "family" ||
    value === "professional" ||
    value === "facility" ||
    value === "community" ||
    value === "internal"
    ? value
    : null;
}

/**
 * The application role of the current session.
 *
 * Deliberately takes no user id: there is nothing for a caller to substitute.
 * The row is selected by `auth.uid()` through row level security, so a token
 * belonging to one account cannot read another's role.
 */
export async function resolveSessionIdentity(
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<SupabaseIdentity | null> {
  const supabase = client ?? (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_identities")
    .select("user_id, app_role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  // A Supabase account with no application identity is not half-authenticated;
  // it is not authorised at all.
  if (error || !data) return null;

  const appRole = parseAppRole(data.app_role);
  if (!appRole || data.status !== "active") return null;

  return { userId: data.user_id as string, appRole, status: "active" };
}

/**
 * Sites the current session may act on, with the role held on each.
 *
 * Read under the caller's token: the `staff_memberships` policy restricts the
 * result to `user_id = auth.uid()`, so the scope cannot be widened from the
 * client even if this query were reached with a forged argument.
 */
export async function listSessionMemberships(userId: string): Promise<StaffMembershipRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_memberships")
    .select("id, user_id, community_id, role, status, created_at")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    // The membership table carries no email, and identity never needs one.
    email: "",
    siteId: row.community_id as string,
    role: row.role as StaffMembershipRecord["role"],
    status: "active",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  }));
}

/** Operator path: grant or update a membership. Service role, server only. */
export async function upsertMembership(input: {
  userId: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
}): Promise<StaffMembershipRecord> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("staff_memberships")
    .upsert(
      {
        user_id: input.userId,
        community_id: input.siteId,
        role: input.role,
        status: "active",
      },
      { onConflict: "user_id,community_id" },
    )
    .select("id, user_id, community_id, role, status, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Could not grant the membership: ${error?.message ?? "unknown error"}`);
  }

  await admin
    .from("app_identities")
    .update({ app_role: "facility", updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .neq("app_role", "internal");

  return {
    id: data.id as string,
    userId: data.user_id as string,
    email: "",
    siteId: data.community_id as string,
    role: data.role as StaffMembershipRecord["role"],
    status: "active",
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
  };
}

export async function setMembershipStatus(
  membershipId: string,
  status: StaffMembershipRecord["status"],
): Promise<StaffMembershipRecord | null> {
  const admin = adminClient();
  const { data } = await admin
    .from("staff_memberships")
    .update({ status })
    .eq("id", membershipId)
    .select("id, user_id, community_id, role, status, created_at")
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    userId: data.user_id as string,
    email: "",
    siteId: data.community_id as string,
    role: data.role as StaffMembershipRecord["role"],
    status: data.status as StaffMembershipRecord["status"],
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
  };
}

export async function createInvitation(input: {
  emailHash: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
  tokenHash: string;
  ttlMs: number;
  invitedByUserId: string;
}): Promise<{ id: string; expiresAt: string }> {
  const admin = adminClient();
  const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
  const { data, error } = await admin
    .from("staff_invitations")
    .insert({
      email_hash: input.emailHash,
      community_id: input.siteId,
      role: input.role,
      token_hash: input.tokenHash,
      expires_at: expiresAt,
      invited_by: input.invitedByUserId,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error(`Could not create the invitation: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id as string, expiresAt: data.expires_at as string };
}

/**
 * Accept an invitation for the current session.
 *
 * The database function does the work in one statement so that two concurrent
 * requests cannot both spend the same token, and it reads the accepting account
 * from the session rather than from the request.
 */
export async function acceptInvitation(
  tokenHash: string,
): Promise<{ ok: true; siteId: string; role: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_staff_invitation", {
    p_token_hash: tokenHash,
  });

  if (error) return { ok: false, error: "Invitation is no longer valid." };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: "Invitation is no longer valid." };

  return {
    ok: true,
    siteId: (row as { site_id: string }).site_id,
    role: (row as { membership_role: string }).membership_role,
  };
}

export async function revokeInvitation(id: string): Promise<void> {
  const admin = adminClient();
  await admin
    .from("staff_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
}

export async function recordAuditEvent(input: {
  event: string;
  actorId?: string | null;
  subjectHash?: string | null;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = adminClient();
  await admin.from("security_audit_log").insert({
    event: input.event,
    actor_id: input.actorId ?? null,
    subject_hash: input.subjectHash ?? null,
    outcome: input.outcome,
    metadata: input.metadata ?? {},
  });
}

/** Fixed window counter shared by every instance, unlike an in-process map. */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  const admin = adminClient();
  const { data, error } = await admin.rpc("consume_auth_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error || !data) {
    // Failing open would turn an outage into an unthrottled credential
    // endpoint. Failing closed *quietly* is almost as bad: it answers "too many
    // attempts" to a caller who made one, and sends whoever debugs it looking
    // for a rate limit that was never reached.
    throw new Error(
      `The rate-limit counter is unavailable: ${error?.message ?? "no response from Supabase"}`,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean((row as { allowed: boolean }).allowed),
    remaining: Number((row as { remaining: number }).remaining ?? 0),
    retryAfterSeconds: Number((row as { retry_after_seconds: number }).retry_after_seconds ?? 0),
  };
}
