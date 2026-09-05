/**
 * Test harness for the row level security suite.
 *
 * Every assertion runs against a real PostgreSQL server. The pool connects as
 * the owner (the "service role" side of the fence) and each case switches into
 * `anon` or `authenticated` inside a transaction, exactly like PostgREST does
 * when it forwards a Supabase JWT. The transaction is always rolled back, so
 * cases never leak state into one another.
 */

import pg from "pg";

export const DATABASE_URL = process.env.RLS_TEST_DATABASE_URL ?? "";

/** Fictitious identifiers, mirroring tests/rls/fixtures.sql. */
export const IDS = {
  familyAOwner: "00000000-0000-4000-8000-0000000000a1",
  familyAViewer: "00000000-0000-4000-8000-0000000000a2",
  familyBOwner: "00000000-0000-4000-8000-0000000000b1",
  staffReadonlyA: "00000000-0000-4000-8000-0000000000c1",
  staffManagerA: "00000000-0000-4000-8000-0000000000c2",
  staffAdminA: "00000000-0000-4000-8000-0000000000c3",
  staffAdminB: "00000000-0000-4000-8000-0000000000d1",
  platformAdmin: "00000000-0000-4000-8000-0000000000e1",
  orgOwnerA: "00000000-0000-4000-8000-0000000000f1",
  legacyStaffA: "00000000-0000-4000-8000-0000000000f2",

  orgA: "11111111-1111-4111-8111-111111110001",
  orgB: "11111111-1111-4111-8111-111111110002",

  siteA: "22222222-2222-4222-8222-222222220001",
  siteB: "22222222-2222-4222-8222-222222220002",
  siteUnlisted: "22222222-2222-4222-8222-222222220003",

  familyA: "33333333-3333-4333-8333-333333330001",
  familyB: "33333333-3333-4333-8333-333333330002",

  seniorA1: "44444444-4444-4444-8444-444444440001",
  seniorA2: "44444444-4444-4444-8444-444444440002",
  seniorB: "44444444-4444-4444-8444-444444440003",

  appA: "55555555-5555-4555-8555-555555550001",
  appB: "55555555-5555-4555-8555-555555550002",
  appADraft: "55555555-5555-4555-8555-555555550003",

  documentA: "66666666-6666-4666-8666-666666660001",
  documentB: "66666666-6666-4666-8666-666666660002",
  documentAPrivate: "66666666-6666-4666-8666-666666660003",

  conversationA: "77777777-7777-4777-8777-7777777c0001",
  membershipReadonlyA: "88888888-8888-4888-8888-888888880001",
  sessionA: "88888888-8888-4888-8888-8888888b0001",
  sessionB: "88888888-8888-4888-8888-8888888b0002",
} as const;

export type Principal = {
  label: string;
  dbRole: "anon" | "authenticated";
  userId: string | null;
};

export const ANONYMOUS: Principal = { label: "visiteur anonyme", dbRole: "anon", userId: null };

export const PRINCIPALS = {
  anonymous: ANONYMOUS,
  familyA: { label: "famille A (propriétaire)", dbRole: "authenticated", userId: IDS.familyAOwner },
  familyAViewer: {
    label: "famille A (lecteur)",
    dbRole: "authenticated",
    userId: IDS.familyAViewer,
  },
  familyB: { label: "famille B (propriétaire)", dbRole: "authenticated", userId: IDS.familyBOwner },
  staffReadonly: {
    label: "staff lecture seule, résidence A",
    dbRole: "authenticated",
    userId: IDS.staffReadonlyA,
  },
  staffAuthorized: {
    label: "staff autorisé (manager), résidence A",
    dbRole: "authenticated",
    userId: IDS.staffManagerA,
  },
  siteAdmin: {
    label: "administrateur, résidence A",
    dbRole: "authenticated",
    userId: IDS.staffAdminA,
  },
  otherSiteStaff: {
    label: "administrateur, résidence B",
    dbRole: "authenticated",
    userId: IDS.staffAdminB,
  },
  platformAdmin: {
    label: "administrateur plateforme",
    dbRole: "authenticated",
    userId: IDS.platformAdmin,
  },
  orgOwner: {
    label: "propriétaire organisation A",
    dbRole: "authenticated",
    userId: IDS.orgOwnerA,
  },
  legacyStaff: {
    label: "équipe legacy, résidence A",
    dbRole: "authenticated",
    userId: IDS.legacyStaffA,
  },
} satisfies Record<string, Principal>;

export type Attempt = {
  ok: boolean;
  rowCount: number;
  rows: Record<string, unknown>[];
  code: string | null;
  message: string | null;
};

export type Session = {
  /** Run one statement and capture the outcome instead of throwing. */
  attempt(sql: string, params?: unknown[]): Promise<Attempt>;
};

let ownerPool: pg.Pool | null = null;
let clientPool: pg.Pool | null = null;

/** Owner connection: fixtures, catalogue introspection, cleanup. */
export function getPool(): pg.Pool {
  if (!ownerPool) {
    ownerPool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  }
  return ownerPool;
}

/**
 * Caller connection, created by scripts/rls/setup-db.mjs. It mirrors Supabase's
 * `authenticator`: it can become `anon` or `authenticated`, it is not a
 * superuser, it does not bypass RLS and it is not a member of `service_role`.
 * Every principal assertion goes through it, so no case can pass on owner
 * privileges by accident.
 */
function getClientPool(): pg.Pool {
  if (!clientPool) {
    const url = new URL(DATABASE_URL);
    url.username = "rls_test_authenticator";
    url.password = "rls_test_authenticator";
    clientPool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  }
  return clientPool;
}

export async function closePool(): Promise<void> {
  if (ownerPool) {
    await ownerPool.end();
    ownerPool = null;
  }
  if (clientPool) {
    await clientPool.end();
    clientPool = null;
  }
}

/**
 * Run `body` as `principal`. The JWT claims are set both as the flat
 * `request.jwt.claim.sub` GUC and as the JSON `request.jwt.claims` blob so the
 * suite behaves identically on old and current `auth.uid()` definitions.
 */
export async function as<T>(principal: Principal, body: (session: Session) => Promise<T>) {
  const client = await getClientPool().connect();
  try {
    await client.query("begin");
    if (principal.userId) {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
        principal.userId,
      ]);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: principal.userId, role: principal.dbRole }),
      ]);
    }
    await client.query("select set_config('role', $1, true)", [principal.dbRole]);

    const session: Session = {
      async attempt(sql, params = []) {
        await client.query("savepoint rls_case");
        try {
          const result = await client.query(sql, params as never[]);
          await client.query("release savepoint rls_case");
          return {
            ok: true,
            rowCount: result.rowCount ?? 0,
            rows: (result.rows ?? []) as Record<string, unknown>[],
            code: null,
            message: null,
          };
        } catch (error) {
          await client.query("rollback to savepoint rls_case");
          await client.query("release savepoint rls_case");
          const err = error as { code?: string; message?: string };
          return {
            ok: false,
            rowCount: 0,
            rows: [],
            code: err.code ?? "unknown",
            message: err.message ?? null,
          };
        }
      },
    };

    return await body(session);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/** Run a statement with owner privileges (RLS bypassed), for setup and audit. */
export async function asOwner<T>(body: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await body(client);
  } finally {
    client.release();
  }
}

/**
 * Policy coverage ledger.
 *
 * Each case declares the policies it puts under load; the last test in the
 * suite compares the ledger with `pg_policies`, so a policy added later
 * without a test fails the build instead of shipping untested.
 */
const exercised = new Set<string>();

export function exercise(...policies: string[]): void {
  for (const policy of policies) exercised.add(policy);
}

export function exercisedPolicies(): Set<string> {
  return exercised;
}

/** `42501` is the RLS / privilege refusal PostgreSQL raises on a bad write. */
export const RLS_VIOLATION = "42501";

/** A write is refused either by an explicit error or by matching zero rows. */
export function refused(attempt: Attempt): boolean {
  if (!attempt.ok) return attempt.code === RLS_VIOLATION;
  return attempt.rowCount === 0;
}
