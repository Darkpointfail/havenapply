/**
 * Supabase-backed identity reads used by security/guards.ts.
 *
 * Credentials/sessions belong to Supabase Auth directly (see
 * guards.ts#currentPrincipal). Staff memberships live in the real
 * `staff_memberships` table (migration 0011) — this is the shared place both
 * guards.ts and admissions/supabase-store.ts read them from, so the query
 * exists exactly once. identity-store.ts remains the local-backend
 * equivalent; it is never used for memberships when Supabase is active.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth-crypto";
import { accountTypeLabel } from "@/lib/auth-store";
import type { StaffMembershipRecord, TeamMemberRecord } from "@/lib/security/identity-store";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function membershipFromRow(row: Row, email = ""): StaffMembershipRecord {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    email,
    siteId: str(row.community_id),
    role: str(row.role, "readonly") as StaffMembershipRecord["role"],
    status: (row.status === "suspended" ? "suspended" : "active") as StaffMembershipRecord["status"],
    createdAt: str(row.created_at),
  };
}

function teamMemberFromRow(row: Row): TeamMemberRecord {
  const profile = (row.profiles ?? {}) as Row;
  const name = [str(profile.first_name), str(profile.last_name)].filter(Boolean).join(" ").trim();
  return {
    id: str(row.id),
    userId: str(row.user_id),
    email: str(profile.email),
    name,
    role: str(row.role, "readonly") as StaffMembershipRecord["role"],
    status: (row.status === "suspended" ? "suspended" : "active") as StaffMembershipRecord["status"],
    createdAt: str(row.created_at),
  };
}

export async function listMembershipsByUser(userId: string): Promise<StaffMembershipRecord[]> {
  const client = await createClient();
  const { data } = await client
    .from("staff_memberships")
    .select("id, user_id, community_id, role, status, created_at")
    .eq("user_id", userId)
    .eq("status", "active");

  // staff_memberships carries no email column; callers that need it (none
  // currently do — see requireDecidingRole/scopeToSite) would join profiles
  // separately.
  return (data ?? []).map((row) => membershipFromRow(row as Row));
}

/**
 * Site-scoped active memberships — used for "does this site already have
 * staff" pre-checks (e.g. community/claim-link). Service-role: a caller
 * checking this generally isn't a member of the site yet, so the
 * `staff_memberships_select` RLS policy (member or site-admin only) would
 * otherwise hide the very rows the check needs to see.
 */
export async function listMembershipsBySite(siteId: string): Promise<StaffMembershipRecord[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("staff_memberships")
    .select("id, user_id, community_id, role, status, created_at, profiles(email)")
    .eq("community_id", siteId)
    .eq("status", "active");
  return (data ?? []).map((row) => {
    const r = row as Row;
    const profile = (r.profiles ?? {}) as Row;
    return membershipFromRow(r, str(profile.email));
  });
}

/**
 * Full team for a site — active and suspended, with the real name/email
 * from `profiles` (migration 0011's `staff_memberships.user_id` references
 * `profiles.id`, so this is a single embedded select, not N+1 lookups).
 * Service-role, same reasoning as listMembershipsBySite: the caller of this
 * function (the team API route) has already proven site-admin access itself,
 * so RLS on staff_memberships/profiles would only get in the way here.
 */
export async function listTeamForSite(siteId: string): Promise<TeamMemberRecord[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("staff_memberships")
    .select("id, user_id, community_id, role, status, created_at, profiles(email, first_name, last_name)")
    .eq("community_id", siteId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => teamMemberFromRow(row as Row));
}

/**
 * Suspend or reactivate an existing membership without touching its role.
 * Unlike upsertMembership (which always sets status back to "active"), this
 * is the only path that can set status: "suspended" — used by the
 * remove/suspend team action.
 */
export async function setMembershipStatus(input: {
  userId: string;
  siteId: string;
  status: StaffMembershipRecord["status"];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server misconfiguration: service role key missing." };
  }
  const { error, count } = await admin
    .from("staff_memberships")
    .update({ status: input.status }, { count: "exact" })
    .eq("user_id", input.userId)
    .eq("community_id", input.siteId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "No membership found for this member on this residence." };
  return { ok: true };
}

/**
 * Insert or reactivate a membership on the real `staff_memberships` table.
 * Its RLS write policy (migration 0011) requires the caller to already be a
 * site admin — by design, only an existing admin may grant access. Every
 * caller of this function has already proven the right to grant membership
 * through its own check (a consumed single-use invitation token, the
 * operator bootstrap secret), so the write itself runs on the service-role
 * client, the same pattern used for the Storage upload fix in
 * family/supabase-store.ts.
 */
export async function upsertMembership(input: {
  userId: string;
  email: string;
  siteId: string;
  role: StaffMembershipRecord["role"];
}): Promise<{ ok: true; record: StaffMembershipRecord } | { ok: false; error: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server misconfiguration: service role key missing." };
  }

  const { data, error } = await admin
    .from("staff_memberships")
    .upsert(
      { user_id: input.userId, community_id: input.siteId, role: input.role, status: "active" },
      { onConflict: "user_id,community_id" },
    )
    .select("id, user_id, community_id, role, status, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to grant membership." };
  }

  return { ok: true, record: membershipFromRow(data as Row, input.email) };
}

/**
 * Look up an existing Supabase Auth account by email, for flows that need to
 * know "does an account already exist" before creating one (invitation
 * accept) or need the account's current role (bootstrap). `profiles` is
 * populated by the `handle_new_user` trigger (migration 0002) and indexed on
 * lower(email); role itself lives only in auth.users' user_metadata, hence
 * the second lookup.
 */
export async function findAccountByEmail(
  email: string,
): Promise<{ userId: string; email: string; role: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", normalized)
    .maybeSingle();
  if (!profile) return null;

  const row = profile as Row;
  const userId = str(row.id);
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const meta = (userData.user?.user_metadata || {}) as Record<string, unknown>;

  return { userId, email: str(row.email, normalized), role: str(meta.role) };
}

/** Move an existing account to the facility role, preserving its other metadata. */
export async function promoteAccountRole(
  userId: string,
  role: "facility",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Server misconfiguration: service role key missing." };

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const meta = (userData.user?.user_metadata || {}) as Record<string, unknown>;

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      role,
      account_type: accountTypeLabel(role),
      community_status: meta.community_status ?? "verified",
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Create a Supabase Auth account for a staff invite/bootstrap flow, pre-
 * confirmed: the person already proved themselves via a single-use
 * invitation token sent to this address, so looping them through email
 * confirmation again would be redundant. registerAccount() in
 * security/auth-service.ts is the local-backend equivalent.
 *
 * The one other admin.createUser() caller in this codebase — the general
 * signup route — was removed: it pre-confirmed every account regardless,
 * which defeated the 6-digit-code confirmation screen entirely. This one
 * is a deliberately different case and stays as-is.
 */
export async function createStaffAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<
  { ok: true; userId: string; email: string } | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server misconfiguration: service role key missing.", status: 503 };
  }

  const email = normalizeEmail(input.email);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: "facility",
      account_type: accountTypeLabel("facility"),
      onboarding_completed: true,
      community_status: "verified",
    },
  });

  if (error || !data.user) {
    const message = error?.message ?? "Unable to create the staff account.";
    const status = /already|exists/i.test(message) ? 409 : 400;
    return { ok: false, error: message, status };
  }

  return { ok: true, userId: data.user.id, email };
}
