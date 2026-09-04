/**
 * Bring a PostgreSQL database to the state the RLS suite expects: every
 * migration applied in order, then the fictitious fixtures loaded.
 *
 * Works against the ephemeral local container and against a dedicated remote
 * test project alike — the only input is a connection string.
 *
 *   node scripts/rls/setup-db.mjs                  # migrate + reset + seed
 *   node scripts/rls/setup-db.mjs --migrate-only   # migrations only
 *
 * Connection string comes from RLS_TEST_DATABASE_URL. Never point this at a
 * database that holds real resident files: it truncates every public table.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const FIXTURES = path.join(ROOT, "tests", "rls", "fixtures.sql");

export async function applyMigrations(client) {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const applied = [];
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query(sql);
    } catch (error) {
      throw new Error(`migration ${file} failed: ${error.message}`);
    }
    applied.push(file);
  }
  return applied;
}

/** Empty every table the fixtures touch, including the Supabase auth users. */
export async function resetData(client) {
  const { rows } = await client.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  `);
  const tables = rows.map((r) => `public.${JSON.stringify(r.relname).replace(/"/g, '"')}`);
  if (tables.length > 0) {
    await client.query(`truncate table ${tables.join(", ")} cascade`);
  }
  await client.query("delete from auth.users");
}

export async function seedFixtures(client) {
  await client.query(await readFile(FIXTURES, "utf8"));
}

/**
 * Login role the suite talks through, mirroring Supabase's `authenticator`:
 * it may become `anon` or `authenticated` and nothing else. No superuser, no
 * BYPASSRLS, no membership in `service_role` — so a case that passes here
 * could not have passed by accident on owner privileges.
 */
export const TEST_LOGIN = { user: "rls_test_authenticator", password: "rls_test_authenticator" };

export async function ensureTestLoginRole(client) {
  await client.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = '${TEST_LOGIN.user}') then
        create role ${TEST_LOGIN.user} login password '${TEST_LOGIN.password}' noinherit;
      end if;
    end
    $$;
  `);
  // `create role ... login noinherit` already carries no SUPERUSER and no
  // BYPASSRLS; the suite asserts both rather than granting them away here,
  // because the Supabase image refuses ALTER ROLE from a non-superuser.
  await client.query(`grant anon, authenticated to ${TEST_LOGIN.user}`);
}

async function main() {
  const url = process.env.RLS_TEST_DATABASE_URL;
  if (!url) {
    console.error("RLS_TEST_DATABASE_URL is not set.");
    process.exit(64);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await applyMigrations(client);
    console.log(`applied ${applied.length} migrations: ${applied.join(", ")}`);
    if (!process.argv.includes("--migrate-only")) {
      await ensureTestLoginRole(client);
      await resetData(client);
      await seedFixtures(client);
      console.log("fixtures loaded");
    }
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
