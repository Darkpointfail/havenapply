/**
 * Minimal Supabase runtime for end-to-end tests.
 *
 * The CLI's `supabase start` boots eleven containers; its Realtime migration
 * step times out on this host and takes the whole stack down with it. The
 * application only speaks to two of those services, so this script runs those
 * two — GoTrue for authentication and PostgREST for data — behind a small
 * router that presents them on one origin, exactly as Kong does.
 *
 * What the application sees is therefore the real thing: real JWTs minted by
 * GoTrue against real `auth.users` rows, and real row level security enforced
 * by PostgREST switching to `anon` or `authenticated`.
 *
 *   node scripts/supabase-stack/stack.mjs up     start and write connection info
 *   node scripts/supabase-stack/stack.mjs down   remove everything
 *   node scripts/supabase-stack/stack.mjs env    print the connection info
 *
 * Credentials are generated per run and written to .supabase-stack/ (ignored by
 * git). Nothing here is a production secret and nothing here reaches a remote
 * project.
 */

import { execFile } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const run = promisify(execFile);

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, ".supabase-stack");
const STATE_FILE = path.join(STATE_DIR, "env.json");

const DB = "haven-supabase-db";
const AUTH = "haven-supabase-auth";
const REST = "haven-supabase-rest";

const DB_IMAGE = process.env.SUPABASE_DB_IMAGE ?? "public.ecr.aws/supabase/postgres:17.6.1.011";
const AUTH_IMAGE = process.env.SUPABASE_AUTH_IMAGE ?? "public.ecr.aws/supabase/gotrue:v2.196.0";
const REST_IMAGE = process.env.SUPABASE_REST_IMAGE ?? "public.ecr.aws/supabase/postgrest:v16.1";

// Every service runs on the host network: container-to-container traffic over
// a user-defined bridge never completes here, which is also what took the CLI
// stack down. Ports are unusual on purpose, to avoid colliding with anything
// the workspace already runs.
const DB_PORT = Number(process.env.SUPABASE_DB_PORT ?? 54332);
const REST_PORT = Number(process.env.SUPABASE_REST_PORT ?? 54333);
const AUTH_PORT = Number(process.env.SUPABASE_AUTH_PORT ?? 54334);
const GATEWAY_PORT = Number(process.env.SUPABASE_GATEWAY_PORT ?? 54331);
const SITE_URL = process.env.SUPABASE_SITE_URL ?? "http://127.0.0.1:3211";

async function docker(args, options = {}) {
  return run("docker", args, { maxBuffer: 32 * 1024 * 1024, ...options });
}

async function silent(args) {
  try {
    return await docker(args);
  } catch {
    return null;
  }
}

function signJwt(payload, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${signature}`;
}

function issueKeys(secret) {
  const now = Math.floor(Date.now() / 1000);
  const base = { iss: "supabase-local", iat: now, exp: now + 60 * 60 * 24 * 7 };
  return {
    anonKey: signJwt({ ...base, role: "anon" }, secret),
    serviceKey: signJwt({ ...base, role: "service_role" }, secret),
  };
}

async function waitFor(label, probe, attempts = 60, delayMs = 1000) {
  for (let i = 0; i < attempts; i += 1) {
    if (await probe()) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${label} did not become ready`);
}

/** `supabase_admin` is the image's superuser; `postgres` is deliberately not. */
async function psql(sql, user = "supabase_admin") {
  return docker([
    "exec", "-e", "PGPASSWORD=postgres", DB,
    "psql", "-U", user, "-d", "postgres", "-qtAc", sql,
  ]);
}

async function startDatabase(dbPassword) {
  await silent(["rm", "-f", DB]);
  await docker([
    // The database keeps its own network namespace and publishes a port. The
    // other two containers run on the host network and reach it through that
    // published port, so no traffic ever crosses the bridge.
    "run", "-d", "--name", DB, "-p", `${DB_PORT}:5432`,
    "-e", "POSTGRES_PASSWORD=postgres",
    "-e", "POSTGRES_DB=postgres",
    DB_IMAGE,
  ]);

  await waitFor("database", async () => {
    const result = await silent(["exec", DB, "pg_isready", "-U", "postgres", "-q"]);
    return result !== null;
  });
  // pg_isready flips true during the bootstrap restart.
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // GoTrue and PostgREST log in as their own roles; the image creates them
  // without a password because the CLI normally sets one here.
  for (const role of ["supabase_auth_admin", "authenticator"]) {
    await psql(`alter role ${role} with login password '${dbPassword}'`);
  }
}

async function startAuth(secret, dbPassword) {
  await silent(["rm", "-f", AUTH]);
  await docker([
    "run", "-d", "--name", AUTH, "--network", "host",
    "-e", "GOTRUE_API_HOST=127.0.0.1",
    "-e", `GOTRUE_API_PORT=${AUTH_PORT}`,
    "-e", `PORT=${AUTH_PORT}`,
    "-e", `API_EXTERNAL_URL=http://127.0.0.1:${GATEWAY_PORT}`,
    "-e", "GOTRUE_DB_DRIVER=postgres",
    "-e", `GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:${dbPassword}@127.0.0.1:${DB_PORT}/postgres?search_path=auth`,
    "-e", `GOTRUE_SITE_URL=${SITE_URL}`,
    "-e", "GOTRUE_URI_ALLOW_LIST=*",
    "-e", `GOTRUE_JWT_SECRET=${secret}`,
    "-e", "GOTRUE_JWT_EXP=3600",
    "-e", "GOTRUE_JWT_AUD=authenticated",
    "-e", "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated",
    "-e", "GOTRUE_DISABLE_SIGNUP=false",
    // No mail server, and none wanted: transactional email is a later
    // milestone. Sign-ups are confirmed on the spot.
    "-e", "GOTRUE_MAILER_AUTOCONFIRM=true",
    "-e", "GOTRUE_EXTERNAL_EMAIL_ENABLED=true",
    "-e", "GOTRUE_LOG_LEVEL=warn",
    AUTH_IMAGE,
  ]);
}

async function startRest(secret, dbPassword) {
  await silent(["rm", "-f", REST]);
  await docker([
    "run", "-d", "--name", REST, "--network", "host",
    "-e", `PGRST_SERVER_PORT=${REST_PORT}`,
    "-e", `PGRST_DB_URI=postgres://authenticator:${dbPassword}@127.0.0.1:${DB_PORT}/postgres`,
    "-e", "PGRST_DB_SCHEMAS=public",
    "-e", "PGRST_DB_ANON_ROLE=anon",
    "-e", `PGRST_JWT_SECRET=${secret}`,
    "-e", "PGRST_DB_USE_LEGACY_GUCS=false",
    "-e", "PGRST_APP_SETTINGS_JWT_SECRET=" + secret,
    "-e", "PGRST_LOG_LEVEL=error",
    REST_IMAGE,
  ]);
}

/** Kong's job, in thirty lines: one origin, two upstreams. */
function startGateway(authTarget, restTarget) {
  const server = http.createServer((req, res) => {
    const isAuth = req.url.startsWith("/auth/v1");
    const target = isAuth ? authTarget : restTarget;
    const prefix = isAuth ? "/auth/v1" : "/rest/v1";

    if (!req.url.startsWith("/auth/v1") && !req.url.startsWith("/rest/v1")) {
      res.writeHead(404).end("no route");
      return;
    }

    const proxied = http.request(
      {
        host: target.host,
        port: target.port,
        method: req.method,
        path: req.url.slice(prefix.length) || "/",
        headers: { ...req.headers, host: `${target.host}:${target.port}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxied.on("error", (error) => {
      if (!res.headersSent) res.writeHead(502);
      res.end(String(error));
    });
    req.pipe(proxied);
  });
  server.listen(GATEWAY_PORT, "127.0.0.1");
  return server;
}

async function probe(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve((response.statusCode ?? 500) < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(2000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

export async function readEnv() {
  return JSON.parse(await readFile(STATE_FILE, "utf8"));
}

async function up() {
  const secret = randomBytes(32).toString("hex");
  const dbPassword = randomBytes(16).toString("hex");
  const { anonKey, serviceKey } = issueKeys(secret);

  await startDatabase(dbPassword);
  await startAuth(secret, dbPassword);
  await startRest(secret, dbPassword);

  const env = {
    url: `http://127.0.0.1:${GATEWAY_PORT}`,
    anonKey,
    serviceKey,
    jwtSecret: secret,
    databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
  };
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(env, null, 2));

  console.log(JSON.stringify(env, null, 2));
}

async function serve() {
  startGateway({ host: "127.0.0.1", port: AUTH_PORT }, { host: "127.0.0.1", port: REST_PORT });

  await waitFor("gateway", () => probe(`http://127.0.0.1:${GATEWAY_PORT}/auth/v1/health`));
  console.log("gateway ready");
  // Hold the process: the router is the only piece not in a container.
  await new Promise(() => {});
}

async function down() {
  await silent(["rm", "-f", AUTH]);
  await silent(["rm", "-f", REST]);
  await silent(["rm", "-f", DB]);
}

const command = process.argv[2] ?? "up";
if (command === "up") await up();
else if (command === "serve") await serve();
else if (command === "down") await down();
else if (command === "env") console.log(await readFile(STATE_FILE, "utf8"));
else {
  console.error(`unknown command: ${command}`);
  process.exit(64);
}
