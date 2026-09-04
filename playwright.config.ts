import { defineConfig } from "@playwright/test";

/**
 * End-to-end authorization checks.
 *
 * Runs against a production build so the tests exercise the same code path as
 * a deployment. Uses the system Chrome channel: no browser download.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);

export default defineConfig({
  testDir: "./e2e",
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
    url: `http://127.0.0.1:${PORT}/site-access`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      HAVEN_SESSION_SECRET: "e2e-session-secret-that-is-long-enough-000000",
      // The staging gate must stay out of the way of these tests.
      SITE_ACCESS_PASSWORD: "",
      HAVEN_BOOTSTRAP_TOKEN: "e2e-bootstrap-token",
    },
  },
});
