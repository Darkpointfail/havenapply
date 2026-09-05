/**
 * FAMILY and STAFF journeys against the Supabase adapter, through the app.
 *
 * The other suite runs the local backend. This one boots the same build with
 * `NEXT_PUBLIC_DATA_BACKEND=supabase` pointed at the stack in
 * scripts/supabase-stack, so the request path is the real one: GoTrue verifies
 * the token, the guard reads the role from `app_identities`, and PostgREST
 * applies row level security to everything the residence sees.
 *
 * Run with: npm run test:e2e:supabase
 */

import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { Client } from "pg";

const PASSWORD = "Correct-Horse-42!";
const ORIGIN = `http://127.0.0.1:${process.env.E2E_PORT ?? 3212}`;

const SITE_A = process.env.E2E_SITE_A ?? "22222222-2222-4222-8222-222222220001";
const SITE_B = process.env.E2E_SITE_B ?? "22222222-2222-4222-8222-222222220002";

let unique = 0;
function email(prefix: string) {
  unique += 1;
  return `${prefix}.${Date.now()}.${unique}@e2e.havenapply.test`;
}

let clientCounter = 0;
function nextClientIp() {
  clientCounter += 1;
  return `198.51.100.${clientCounter % 250}`;
}

async function csrf(api: APIRequestContext): Promise<string> {
  const res = await api.get("/api/auth/csrf");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { csrfToken: string }).csrfToken;
}

async function post(api: APIRequestContext, url: string, data: unknown) {
  return api.post(url, {
    data,
    headers: { "x-haven-csrf": await csrf(api), origin: ORIGIN },
  });
}

async function me(api: APIRequestContext) {
  const res = await api.get("/api/auth/me");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as {
    user: null | { id: string; email: string; role: string; siteIds: string[] };
  };
}

async function newSession(browser: Browser) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": nextClientIp() },
  });
  return { context, api: context.request };
}

/** Direct connection, standing in for the operator provisioning a residence. */
async function withDatabase<T>(body: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.E2E_SUPABASE_DB_URL });
  await client.connect();
  try {
    return await body(client);
  } finally {
    await client.end();
  }
}

test.describe("identité Supabase de bout en bout", () => {
  test("une famille s'inscrit, se connecte et ne voit que son dossier", async ({ browser }) => {
    const address = email("supabase.famille");
    const { context, api } = await newSession(browser);

    const registered = await post(api, "/api/auth/register", {
      email: address,
      password: PASSWORD,
      firstName: "Camille",
      lastName: "Tremblay",
    });
    expect(registered.status(), await registered.text()).toBe(201);
    const { userId } = (await registered.json()) as { userId: string };

    const signedIn = await post(api, "/api/auth/sign-in", { email: address, password: PASSWORD });
    expect(signedIn.status(), await signedIn.text()).toBe(200);

    // The role is the one the database holds, not the one the sign-up asked for.
    const identity = await me(api);
    expect(identity.user).toMatchObject({ id: userId, role: "family" });
    expect(identity.user?.siteIds).toEqual([]);

    // A family account is refused the residence workspace outright.
    expect((await api.get("/api/admissions/residence")).status()).toBe(403);

    // The session lives in the cookie `@supabase/ssr` manages, and the server
    // is what reads it. It is not HttpOnly, because the browser client still
    // refreshes the same session — see the note in IDENTITY_PARITY.md.
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name.startsWith("sb-"));
    expect(authCookie).toBeTruthy();
    expect(authCookie?.sameSite).toBe("Lax");

    // Nothing the client sends can change who the server thinks it is.
    const impersonated = await api.get("/api/auth/me", {
      headers: { "x-haven-user-id": "00000000-0000-4000-8000-0000000000e1" },
    });
    expect(((await impersonated.json()) as { user: { id: string } }).user.id).toBe(userId);

    await context.close();
  });

  test("une résidence résout ses sites depuis une session neuve", async ({ browser }) => {
    const address = email("supabase.staff");
    const { context, api } = await newSession(browser);

    const registered = await post(api, "/api/auth/register", {
      email: address,
      password: PASSWORD,
      firstName: "Sophie",
      lastName: "Bergeron",
    });
    expect(registered.status()).toBe(201);
    const { userId } = (await registered.json()) as { userId: string };

    // Operator provisioning: two residences, two different roles.
    await withDatabase(async (client) => {
      for (const [siteId, role] of [
        [SITE_A, "manager"],
        [SITE_B, "readonly"],
      ] as const) {
        await client.query(
          `insert into public.staff_memberships (user_id, community_id, role, status)
           values ($1, $2, $3, 'active')
           on conflict (user_id, community_id) do update set role = excluded.role`,
          [userId, siteId, role],
        );
      }
      await client.query(
        "update public.app_identities set app_role = 'facility' where user_id = $1",
        [userId],
      );
    });

    // A brand-new session, with nothing carried over from provisioning.
    const { context: fresh, api: freshApi } = await newSession(browser);
    const signedIn = await post(freshApi, "/api/auth/sign-in", {
      email: address,
      password: PASSWORD,
    });
    expect(signedIn.status(), await signedIn.text()).toBe(200);

    const identity = await me(freshApi);
    expect(identity.user?.role).toBe("facility");
    expect([...(identity.user?.siteIds ?? [])].sort()).toEqual([SITE_A, SITE_B].sort());

    // The workspace answers, and narrowing outside the membership is refused.
    expect((await freshApi.get("/api/admissions/residence")).status()).toBe(200);
    expect(
      (await freshApi.get(`/api/admissions/residence?siteId=${SITE_A}`)).status(),
    ).toBe(200);
    expect(
      (
        await freshApi.get(
          "/api/admissions/residence?siteId=22222222-2222-4222-8222-222222220003",
        )
      ).status(),
    ).toBe(403);

    // Revoking the membership takes the scope away from the open session.
    await withDatabase((client) =>
      client.query("update public.staff_memberships set status = 'suspended' where user_id = $1", [
        userId,
      ]),
    );
    expect((await freshApi.get("/api/admissions/residence")).status()).toBe(403);

    await Promise.all([context.close(), fresh.close()]);
  });

  test("réécrire ses métadonnées ne donne pas le rôle interne", async ({ browser }) => {
    const address = email("supabase.escalade");
    const { context, api } = await newSession(browser);

    await post(api, "/api/auth/register", {
      email: address,
      password: PASSWORD,
      firstName: "Alex",
      lastName: "Roy",
    });
    await post(api, "/api/auth/sign-in", { email: address, password: PASSWORD });

    // Straight at GoTrue with the account's own token, the way an attacker
    // would rather than through the application.
    const session = await api.get("/api/auth/me");
    expect(session.ok()).toBeTruthy();

    const claimed = await post(api, "/api/auth/register", {
      email: email("supabase.escalade.role"),
      password: PASSWORD,
      role: "internal",
      firstName: "Alex",
      lastName: "Roy",
    });
    expect(claimed.status()).toBe(403);

    expect((await me(api)).user?.role).toBe("family");
    await context.close();
  });

  test("se déconnecter ferme réellement la session", async ({ browser }) => {
    const address = email("supabase.deconnexion");
    const { context, api } = await newSession(browser);

    await post(api, "/api/auth/register", {
      email: address,
      password: PASSWORD,
      firstName: "Marie",
      lastName: "Fortin",
    });
    await post(api, "/api/auth/sign-in", { email: address, password: PASSWORD });
    expect((await me(api)).user).not.toBeNull();

    const out = await api.delete("/api/auth/session", {
      headers: { "x-haven-csrf": await csrf(api), origin: ORIGIN },
    });
    expect(out.ok()).toBeTruthy();

    expect((await me(api)).user).toBeNull();
    expect((await api.get("/api/admissions/family")).status()).toBe(401);

    await context.close();
  });
});
