import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * The same production build, run against Supabase instead of the local store.
 *
 * Connection details come from the stack that scripts/supabase-stack brought
 * up, so nothing here is committed and nothing points at a remote project.
 */
const PORT = Number(process.env.E2E_PORT ?? 3212);

type StackEnv = { url: string; anonKey: string; serviceKey: string; databaseUrl: string };

function stack(): StackEnv {
  const file = path.join(process.cwd(), ".supabase-stack", "env.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StackEnv;
  } catch {
    throw new Error(
      "The Supabase stack is not running. Start it with `npm run supabase:stack up`.",
    );
  }
}

const env = stack();

// The tests stand in for an operator provisioning a residence, so they need the
// database directly. The config is loaded in every worker, which makes this the
// place to hand it over.
process.env.E2E_SUPABASE_DB_URL = env.databaseUrl;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /supabase-identity\.spec\.ts/,
  globalSetup: "./e2e/global-setup.supabase.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
    trace: "off",
  },
  webServer: {
    command: `NODE_ENV=production PORT=${PORT} node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/auth/csrf`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_DATA_BACKEND: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: env.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.anonKey,
      // Server side only: the privileged writes (audit, rate limits, operator
      // provisioning) have no policy that would let a session do them.
      SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
      HAVEN_SESSION_SECRET: "e2e-session-secret-that-is-long-enough-000000",
      SITE_ACCESS_PASSWORD: "",
      E2E_SUPABASE_DB_URL: env.databaseUrl,
    },
  },
});
