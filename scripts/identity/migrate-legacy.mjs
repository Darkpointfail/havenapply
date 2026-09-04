/**
 * Move the filesystem identities into Supabase, deterministically.
 *
 * Accounts created before Supabase identity are keyed by `usr_<uuid>` in
 * `.data/identity/state.json`. Supabase keys everything on `auth.users.id`.
 * The two have to be reconciled exactly once, by an operator, with the result
 * written down — never by a request handler guessing from an email address.
 *
 * Matching happens here, on the address, because that is the only field the two
 * systems share. It is a migration decision, reviewable and reversible, not a
 * runtime one. Anything ambiguous is reported and skipped rather than resolved
 * by picking a row.
 *
 *   node scripts/identity/migrate-legacy.mjs            report only
 *   node scripts/identity/migrate-legacy.mjs --apply    write the links
 *   node scripts/identity/migrate-legacy.mjs --rollback undo the last run
 *
 * Requires DATABASE_URL (a direct Postgres connection, service side).
 * The report is written to .data/identity/migration-report.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, ".data", "identity", "state.json");
const REPORT_FILE = path.join(ROOT, ".data", "identity", "migration-report.json");

const APPLY = process.argv.includes("--apply");
const ROLLBACK = process.argv.includes("--rollback");

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.RLS_TEST_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required (direct Postgres connection).");
  process.exit(64);
}

/** The local store's roles map one to one onto the application roles. */
function appRoleFor(credential) {
  return credential.role === "community" ? "facility" : credential.role;
}

async function readLegacyState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return { credentials: [], memberships: [], invitations: [] };
  }
}

async function rollback(client) {
  let report;
  try {
    report = JSON.parse(await readFile(REPORT_FILE, "utf8"));
  } catch {
    console.error("No migration report to roll back.");
    process.exit(1);
  }

  // Both lists describe links this migration is responsible for: one it wrote,
  // one it found already in place from an earlier run of itself.
  const links = [...(report.linked ?? []), ...(report.alreadyLinked ?? [])];

  let unlinked = 0;
  for (const link of links) {
    const { rows } = await client.query("select public.unlink_legacy_identity($1) as n", [
      link.legacyUserId,
    ]);
    unlinked += rows[0].n;
  }

  // Only memberships this migration created are removed. One granted since,
  // through an invitation, is somebody's actual access.
  let removed = 0;
  for (const membershipId of report.membershipsCreated ?? []) {
    const result = await client.query("delete from public.staff_memberships where id = $1", [
      membershipId,
    ]);
    removed += result.rowCount;
  }

  // Roles are restored to the default; an account that has since been promoted
  // through an invitation keeps its promotion.
  for (const link of links) {
    await client.query(
      `update public.app_identities set app_role = 'family', updated_at = timezone('utc', now())
        where user_id = $1
          and not exists (select 1 from public.staff_memberships m
                           where m.user_id = $1 and m.status = 'active')`,
      [link.userId],
    );
  }

  console.log(JSON.stringify({ unlinked, membershipsRemoved: removed }, null, 2));
}

async function migrate(client) {
  const state = await readLegacyState();
  const credentials = state.credentials ?? [];
  const memberships = state.memberships ?? [];
  const invitations = state.invitations ?? [];

  const report = {
    at: new Date().toISOString(),
    applied: APPLY,
    linked: [],
    membershipsCreated: [],
    orphanedLegacyAccounts: [],
    ambiguousAddresses: [],
    alreadyLinked: [],
    membershipsWithoutIdentity: [],
    pendingInvitations: [],
    supabaseAccountsWithoutLegacy: 0,
  };

  const resolved = new Map();

  for (const credential of credentials) {
    const email = String(credential.email ?? "").trim().toLowerCase();
    const { rows } = await client.query(
      "select id from auth.users where lower(email) = $1 order by created_at asc",
      [email],
    );

    if (rows.length === 0) {
      // A profile with no Supabase account. It cannot be created here: there is
      // no password to carry over, and inventing one would be worse than
      // leaving the account visible in the report.
      report.orphanedLegacyAccounts.push({ legacyUserId: credential.userId });
      continue;
    }
    if (rows.length > 1) {
      report.ambiguousAddresses.push({
        legacyUserId: credential.userId,
        candidates: rows.length,
      });
      continue;
    }

    const userId = rows[0].id;
    const existing = await client.query(
      "select legacy_user_id from public.app_identities where user_id = $1",
      [userId],
    );
    if (existing.rows[0]?.legacy_user_id && existing.rows[0].legacy_user_id !== credential.userId) {
      report.ambiguousAddresses.push({
        legacyUserId: credential.userId,
        reason: "supabase account already linked to another legacy identifier",
      });
      continue;
    }
    if (existing.rows[0]?.legacy_user_id === credential.userId) {
      report.alreadyLinked.push({ legacyUserId: credential.userId, userId });
      resolved.set(credential.userId, userId);
      continue;
    }

    if (APPLY) {
      await client.query("select public.link_legacy_identity($1, $2, $3)", [
        userId,
        credential.userId,
        appRoleFor(credential),
      ]);
    }
    resolved.set(credential.userId, userId);
    report.linked.push({ legacyUserId: credential.userId, userId, appRole: appRoleFor(credential) });
  }

  for (const membership of memberships) {
    if (membership.status !== "active") continue;
    const userId = resolved.get(membership.userId);
    if (!userId) {
      report.membershipsWithoutIdentity.push({
        membershipId: membership.id,
        siteId: membership.siteId,
      });
      continue;
    }

    const community = await client.query("select id from public.communities where id = $1", [
      membership.siteId,
    ]);
    if (community.rowCount === 0) {
      report.membershipsWithoutIdentity.push({
        membershipId: membership.id,
        siteId: membership.siteId,
        reason: "unknown community",
      });
      continue;
    }

    if (!APPLY) continue;
    const inserted = await client.query(
      `insert into public.staff_memberships (user_id, community_id, role, status)
       values ($1, $2, $3, 'active')
       on conflict (user_id, community_id) do update set role = excluded.role, status = 'active'
       returning id, (xmax = 0) as created`,
      [userId, membership.siteId, membership.role],
    );
    if (inserted.rows[0].created) report.membershipsCreated.push(inserted.rows[0].id);
  }

  // Pending invitations are not migrated: the token hash is bound to the local
  // store's secret. They are listed so an operator can reissue them.
  for (const invitation of invitations) {
    if (invitation.usedAt || invitation.revokedAt) continue;
    if (Date.parse(invitation.expiresAt) < Date.now()) continue;
    report.pendingInvitations.push({ invitationId: invitation.id, siteId: invitation.siteId });
  }

  const unlinked = await client.query(
    "select count(*)::int as n from public.app_identities where legacy_user_id is null",
  );
  report.supabaseAccountsWithoutLegacy = unlinked.rows[0].n;

  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.error("\nReport only. Re-run with --apply to write the links.");
  }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  if (ROLLBACK) await rollback(client);
  else await migrate(client);
} finally {
  await client.end();
}
