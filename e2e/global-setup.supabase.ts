import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

/**
 * Start each run with the rate-limit counters cleared.
 *
 * Unlike the local backend, the Supabase counters live in the database and
 * survive between runs, so a second execution would be throttled on sign-up
 * before reaching anything this suite is about.
 */
export default async function globalSetup() {
  const file = path.join(process.cwd(), ".supabase-stack", "env.json");
  const { databaseUrl } = JSON.parse(readFileSync(file, "utf8")) as { databaseUrl: string };

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("truncate table public.auth_rate_limits");
  } finally {
    await client.end();
  }
}
