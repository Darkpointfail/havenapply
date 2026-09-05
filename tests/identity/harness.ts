/**
 * Test helpers for identity parity, against the running Supabase stack.
 *
 * Unlike tests/rls/harness.ts, which impersonates a principal by setting JWT
 * claims inside a transaction, this one goes through the wire: GoTrue mints the
 * token, PostgREST verifies it and switches role. That is the only way to know
 * that an account created by a real sign-up resolves to a real scope.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

export type StackEnv = {
  url: string;
  anonKey: string;
  serviceKey: string;
  databaseUrl: string;
};

let cachedEnv: StackEnv | null | undefined;

/** Null when the stack is not running, so suites can skip instead of fail. */
export function stackEnv(): StackEnv | null {
  if (cachedEnv !== undefined) return cachedEnv;
  try {
    const file = path.join(process.cwd(), ".supabase-stack", "env.json");
    cachedEnv = JSON.parse(readFileSync(file, "utf8")) as StackEnv;
  } catch {
    cachedEnv = null;
  }
  return cachedEnv;
}

export const stackAvailable = () => stackEnv() !== null;

let pool: pg.Pool | null = null;

/** Direct connection, for setting up fixtures and inspecting the outcome. */
export function db(): pg.Pool {
  const env = stackEnv();
  if (!env) throw new Error("Supabase stack is not running");
  pool ??= new pg.Pool({ connectionString: env.databaseUrl, max: 4 });
  return pool;
}

export async function closeDb() {
  await pool?.end();
  pool = null;
}

export type Account = {
  userId: string;
  email: string;
  accessToken: string;
};

function api(pathname: string) {
  const env = stackEnv();
  if (!env) throw new Error("Supabase stack is not running");
  return `${env.url}${pathname}`;
}

function keys() {
  const env = stackEnv();
  if (!env) throw new Error("Supabase stack is not running");
  return env;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}@example.test`;
}

/** A real GoTrue sign-up: creates auth.users and fires the identity trigger. */
export async function signUp(email: string, password = "Correct-Horse-9!"): Promise<Account> {
  const response = await fetch(api("/auth/v1/signup"), {
    method: "POST",
    headers: { "content-type": "application/json", apikey: keys().anonKey },
    body: JSON.stringify({ email, password }),
  });
  const json = (await response.json()) as {
    user?: { id: string };
    access_token?: string;
    msg?: string;
  };
  if (!response.ok || !json.user || !json.access_token) {
    throw new Error(`sign-up failed: ${response.status} ${json.msg ?? ""}`);
  }
  return { userId: json.user.id, email, accessToken: json.access_token };
}

/** A fresh session for an existing account, with no memory of the previous one. */
export async function signIn(email: string, password = "Correct-Horse-9!"): Promise<Account> {
  const response = await fetch(api("/auth/v1/token?grant_type=password"), {
    method: "POST",
    headers: { "content-type": "application/json", apikey: keys().anonKey },
    body: JSON.stringify({ email, password }),
  });
  const json = (await response.json()) as {
    user?: { id: string };
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !json.user || !json.access_token) {
    throw new Error(`sign-in failed: ${response.status} ${json.error_description ?? ""}`);
  }
  return { userId: json.user.id, email, accessToken: json.access_token };
}

/** Rewrite one's own metadata, which is exactly what an attacker would try. */
export async function updateOwnMetadata(
  account: Account,
  data: Record<string, unknown>,
): Promise<number> {
  const response = await fetch(api("/auth/v1/user"), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      apikey: keys().anonKey,
      authorization: `Bearer ${account.accessToken}`,
    },
    body: JSON.stringify({ data }),
  });
  return response.status;
}

export type RestResult<T = unknown> = { status: number; body: T };

export async function rest<T = unknown>(
  pathname: string,
  options: { token?: string; method?: string; body?: unknown; serviceRole?: boolean } = {},
): Promise<RestResult<T>> {
  const env = keys();
  const key = options.serviceRole ? env.serviceKey : env.anonKey;
  const authorization = options.serviceRole
    ? `Bearer ${env.serviceKey}`
    : options.token
      ? `Bearer ${options.token}`
      : `Bearer ${env.anonKey}`;

  const response = await fetch(api(`/rest/v1${pathname}`), {
    method: options.method ?? "GET",
    headers: {
      apikey: key,
      authorization,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body: body as T };
}

export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown>,
  options: { token?: string; serviceRole?: boolean } = {},
): Promise<RestResult<T>> {
  return rest<T>(`/rpc/${name}`, { ...options, method: "POST", body: args });
}

/** What the application's guard reads: the role, for the session's own id. */
export async function resolveIdentity(account: Account) {
  return rest<Array<{ user_id: string; app_role: string; status: string }>>(
    `/app_identities?select=user_id,app_role,status&user_id=eq.${account.userId}`,
    { token: account.accessToken },
  );
}

/** What the staff guard reads: the sites this session may act on. */
export async function resolveMemberships(account: Account) {
  return rest<Array<{ community_id: string; role: string; status: string }>>(
    `/staff_memberships?select=community_id,role,status&user_id=eq.${account.userId}&status=eq.active`,
    { token: account.accessToken },
  );
}
