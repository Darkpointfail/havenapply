/**
 * Rehearse the upgrade the way a real deployment meets it.
 *
 * A fresh install applying all twelve migrations proves very little about a
 * database that already holds accounts. So this brings one up at 0011, with
 * fixtures and a filesystem identity store beside it, then applies 0012 alone
 * and runs the migration: link, verify, roll back, verify again.
 *
 *   node scripts/identity/upgrade-check.mjs
 *
 * Uses the same ephemeral container as the RLS suite and throws it away.
 */

import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import pg from "pg";

const run = promisify(execFile);
const ROOT = process.cwd();

function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function localDb(command) {
  const { stdout } = await run("bash", [path.join(ROOT, "scripts/rls/local-db.sh"), command]);
  return stdout.trim();
}

async function setupDb(databaseUrl, args) {
  await run("node", [path.join(ROOT, "scripts/rls/setup-db.mjs"), ...args], {
    env: { ...process.env, RLS_TEST_DATABASE_URL: databaseUrl },
  });
}

async function migrateLegacy(cwd, databaseUrl, args) {
  await run("node", [path.join(ROOT, "scripts/identity/migrate-legacy.mjs"), ...args], {
    cwd,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

let workDir = null;

try {
  await localDb("down").catch(() => {});
  const databaseUrl = await localDb("up");

  console.log("--- existing database: migrations through 0011");
  await setupDb(databaseUrl, ["--up-to=0011"]);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("--- an account that predates Supabase identity");
  const legacyEmail = "legacy.upgrade@example.test";
  const legacyUserId = `usr_${randomUUID()}`;
  const { rows } = await client.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
             $1, 'x', timezone('utc', now()), timezone('utc', now()))
     returning id`,
    [legacyEmail],
  );
  const userId = rows[0].id;

  workDir = await mkdtemp(path.join(tmpdir(), "haven-upgrade-"));
  await mkdir(path.join(workDir, ".data", "identity"), { recursive: true });
  await writeFile(
    path.join(workDir, ".data", "identity", "state.json"),
    JSON.stringify({
      credentials: [{ userId: legacyUserId, email: legacyEmail, role: "facility" }],
      memberships: [
        {
          id: "mem_upgrade",
          userId: legacyUserId,
          // A residence that no longer exists. The run has to report it rather
          // than place the membership somewhere plausible.
          siteId: "22222222-2222-4222-8222-222222229999",
          role: "manager",
          status: "active",
        },
      ],
      invitations: [],
    }),
  );

  console.log("--- upgrade: 0012 on top of the existing database");
  await setupDb(databaseUrl, ["--migrate-only"]);

  console.log("--- migrate the legacy identity");
  await migrateLegacy(workDir, databaseUrl, ["--apply"]);

  const linked = await client.query(
    "select legacy_user_id, app_role from public.app_identities where user_id = $1",
    [userId],
  );
  check(
    linked.rows[0]?.legacy_user_id === legacyUserId,
    `expected ${legacyUserId}, got ${linked.rows[0]?.legacy_user_id}`,
  );
  check(
    linked.rows[0]?.app_role === "facility",
    `expected role facility, got ${linked.rows[0]?.app_role}`,
  );

  const report = JSON.parse(
    await readFile(path.join(workDir, ".data", "identity", "migration-report.json"), "utf8"),
  );
  check(
    report.membershipsWithoutIdentity.length === 1,
    `expected one unplaced membership, got ${report.membershipsWithoutIdentity.length}`,
  );

  // The trigger only fires on new sign-ups, so accounts that predate 0012 must
  // have been backfilled by the migration itself. Any left over would
  // authenticate and then resolve no role, which is a lockout.
  const missing = await client.query(
    `select count(*)::int as n from auth.users u
      left join public.app_identities i on i.user_id = u.id
      where i.user_id is null`,
  );
  check(missing.rows[0].n === 0, `${missing.rows[0].n} existing accounts have no identity`);

  // And the backfilled role comes from the membership tables, not metadata.
  const staff = await client.query(
    `select i.app_role from public.app_identities i
      join public.staff_memberships m on m.user_id = i.user_id and m.status = 'active'
      limit 1`,
  );
  check(staff.rows[0]?.app_role === "facility", "an existing staff account was not recognised");

  console.log("--- roll back");
  await migrateLegacy(workDir, databaseUrl, ["--rollback"]);
  const after = await client.query(
    "select legacy_user_id from public.app_identities where user_id = $1",
    [userId],
  );
  check(after.rows[0]?.legacy_user_id === null, `rollback left ${after.rows[0]?.legacy_user_id}`);

  await client.end();
  console.log("upgrade from an existing database: ok");
} finally {
  if (workDir) await rm(workDir, { recursive: true, force: true });
  await localDb("down").catch(() => {});
}
