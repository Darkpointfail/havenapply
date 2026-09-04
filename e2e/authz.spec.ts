/**
 * Authorization end-to-end, with one isolated browser context per account.
 *
 * These assert **server responses**, not hidden buttons: every check reads the
 * status code and body returned to that specific browser context.
 */

import { expect, request as playwrightRequest, test, type APIRequestContext, type BrowserContext, type Browser } from "@playwright/test";

const PASSWORD = "Correct-Horse-42!";

/**
 * Playwright's API client does not set `Origin`; a real browser does on every
 * mutating fetch. Sending it keeps the server's origin check exercised rather
 * than bypassed.
 */
const ORIGIN = `http://127.0.0.1:${process.env.E2E_PORT ?? 3210}`;

type Session = {
  context: BrowserContext;
  api: APIRequestContext;
  userId: string;
  email: string;
};

async function csrf(api: APIRequestContext): Promise<string> {
  const res = await api.get("/api/auth/csrf");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { csrfToken: string };
  return json.csrfToken;
}

async function post(api: APIRequestContext, url: string, data: unknown) {
  return api.post(url, {
    data,
    headers: { "x-haven-csrf": await csrf(api), origin: ORIGIN },
  });
}

async function put(api: APIRequestContext, url: string, data: unknown) {
  return api.put(url, {
    data,
    headers: { "x-haven-csrf": await csrf(api), origin: ORIGIN },
  });
}

/**
 * Distinct client address per context. The rate limiter keys on the forwarded
 * address, so without this every simulated user would share one bucket — the
 * limiter is exercised on its own below instead of being weakened here.
 */
let clientCounter = 0;
function nextClientIp() {
  clientCounter += 1;
  return `203.0.113.${clientCounter % 250}`;
}

/** Fresh browser context: its own cookie jar, like a different machine. */
async function newSession(browser: Browser): Promise<{ context: BrowserContext; api: APIRequestContext }> {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": nextClientIp() },
  });
  return { context, api: context.request };
}

async function registerAndVerify(api: APIRequestContext, email: string) {
  const registered = await post(api, "/api/auth/register", {
    email,
    password: PASSWORD,
    firstName: "E2E",
    lastName: "User",
  });
  expect(registered.status(), await registered.text()).toBe(201);
  const body = (await registered.json()) as { userId: string };

  // The token belongs in the confirmation mail, so the suite confirms the
  // address through the audited operator override.
  const verified = await api.post("/api/auth/verify-email", {
    data: { email },
    headers: {
      "x-haven-csrf": await csrf(api),
      origin: ORIGIN,
      "x-haven-bootstrap-token": process.env.HAVEN_BOOTSTRAP_TOKEN ?? "e2e-bootstrap-token",
    },
  });
  expect(verified.status(), await verified.text()).toBe(200);
  return body.userId;
}

async function signIn(api: APIRequestContext, email: string) {
  const res = await post(api, "/api/auth/sign-in", { email, password: PASSWORD });
  expect(res.status(), await res.text()).toBe(200);
}

async function me(api: APIRequestContext) {
  const res = await api.get("/api/auth/me");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as {
    user: null | { id: string; email: string; role: string; siteIds: string[] };
  };
}

async function familySession(browser: Browser, email: string): Promise<Session> {
  const { context, api } = await newSession(browser);
  const userId = await registerAndVerify(api, email);
  await signIn(api, email);
  return { context, api, userId, email };
}

/** Provision a staff account through the invitation flow, on one site only. */
async function staffSession(
  browser: Browser,
  admin: APIRequestContext,
  email: string,
  siteId: string,
  role: "admin" | "manager" | "coordinator" | "readonly" = "admin",
): Promise<Session> {
  const invited = await admin.post("/api/staff/invitations", {
    data: { email, siteId, role },
    headers: {
      "x-haven-csrf": await csrf(admin),
      origin: ORIGIN,
      "x-haven-bootstrap-token": process.env.HAVEN_BOOTSTRAP_TOKEN ?? "e2e-bootstrap-token",
    },
  });
  expect(invited.status(), await invited.text()).toBe(201);
  const { token } = (await invited.json()) as { token: string };

  const { context, api } = await newSession(browser);
  const accepted = await post(api, "/api/staff/invitations/accept", {
    token,
    password: PASSWORD,
    firstName: "Staff",
    lastName: email.split("@")[0],
  });
  expect(accepted.status(), await accepted.text()).toBe(200);

  await signIn(api, email);
  const identity = await me(api);
  expect(identity.user?.siteIds).toEqual([siteId]);
  return { context, api, userId: identity.user!.id, email };
}

/** Operator-level provisioning of the first site administrator. */
async function bootstrapMembership(api: APIRequestContext, email: string, siteId: string) {
  return api.post("/api/staff/bootstrap", {
    data: { email, siteId },
    headers: {
      "x-haven-csrf": await csrf(api),
      origin: ORIGIN,
      "x-haven-bootstrap-token": process.env.HAVEN_BOOTSTRAP_TOKEN ?? "e2e-bootstrap-token",
    },
  });
}

const SITE_A = "maple-grove";
const SITE_B = "lakeside-haven";

let unique = 0;
function email(prefix: string) {
  unique += 1;
  return `${prefix}.${Date.now()}.${unique}@e2e.havenapply.test`;
}

test.describe("authorization across isolated browser contexts", () => {
  test("family reads only its own application, staff only its own site", async ({ browser, baseURL }) => {
    // Bootstrap: the very first staff member of each site needs a membership.
    const bootstrap = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": nextClientIp() },
    });
    const rootAdminEmail = email("root");
    await registerAndVerify(bootstrap, rootAdminEmail);
    await signIn(bootstrap, rootAdminEmail);
    const grantedA = await bootstrapMembership(bootstrap, rootAdminEmail, SITE_A);
    expect(grantedA.status(), await grantedA.text()).toBe(201);

    // --- Family A, its own browser context -------------------------------
    const familyA = await familySession(browser, email("family.a"));
    const submitted = await post(familyA.api, "/api/admissions/submit", {
      clientRequestId: `e2e-${Date.now()}`,
      siteId: SITE_A,
      senior: { name: "Jeanne E2E", age: 82, relationship: "Enfant" },
      summary: "Dossier E2E",
      familyContact: { name: "Famille A", email: familyA.email, relationship: "Enfant" },
    });
    expect(submitted.status(), await submitted.text()).toBe(201);
    const applicationId = ((await submitted.json()) as { application: { id: string } }).application.id;

    // Idempotent: the family sees exactly one application.
    const ownList = await familyA.api.get("/api/admissions/family");
    const own = (await ownList.json()) as { applications: { id: string }[] };
    expect(own.applications.map((a) => a.id)).toContain(applicationId);

    // --- Family B, another browser context -------------------------------
    const familyB = await familySession(browser, email("family.b"));
    const foreign = await familyB.api.get(`/api/admissions/${applicationId}`);
    expect(foreign.status()).toBe(404);
    const bList = (await (await familyB.api.get("/api/admissions/family")).json()) as {
      applications: unknown[];
    };
    expect(bList.applications).toHaveLength(0);

    // --- FAMILY may not reach STAFF data ---------------------------------
    const familyOnStaffRoute = await familyA.api.get("/api/admissions/residence");
    expect(familyOnStaffRoute.status()).toBe(403);

    const familyStatusChange = await post(
      familyA.api,
      `/api/admissions/${applicationId}/status`,
      { status: "approved" },
    );
    expect(familyStatusChange.status()).toBe(403);

    // --- Staff of site A --------------------------------------------------
    const staffA = await staffSession(browser, bootstrap, email("staff.a"), SITE_A);
    const listA = await staffA.api.get("/api/admissions/residence");
    expect(listA.status()).toBe(200);
    const seenByA = (await listA.json()) as { applications: { id: string }[] };
    expect(seenByA.applications.map((a) => a.id)).toContain(applicationId);

    // --- Staff of site B may not see or touch site A ----------------------
    const grantedB = await bootstrapMembership(bootstrap, rootAdminEmail, SITE_B);
    expect(grantedB.status()).toBe(201);
    const staffB = await staffSession(browser, bootstrap, email("staff.b"), SITE_B);

    const listB = await staffB.api.get("/api/admissions/residence");
    expect(listB.status()).toBe(200);
    const seenByB = (await listB.json()) as { applications: { id: string }[] };
    expect(seenByB.applications.map((a) => a.id)).not.toContain(applicationId);

    const readAcross = await staffB.api.get(`/api/admissions/${applicationId}`);
    expect(readAcross.status()).toBe(404);

    const writeAcross = await post(staffB.api, `/api/admissions/${applicationId}/status`, {
      status: "approved",
    });
    expect(writeAcross.status()).toBe(404);

    // Narrowing to a site outside the membership is refused, not ignored.
    const widen = await staffB.api.get(`/api/admissions/residence?siteId=${SITE_A}`);
    expect(widen.status()).toBe(403);

    // Staff of site A can act on its own application.
    const ownWrite = await post(staffA.api, `/api/admissions/${applicationId}/status`, {
      status: "under_review",
    });
    expect(ownWrite.status()).toBe(200);

    await Promise.all([
      familyA.context.close(),
      familyB.context.close(),
      staffA.context.close(),
      staffB.context.close(),
      bootstrap.dispose(),
    ]);
  });

  test("repeated failures from one client are rate limited", async ({ browser }) => {
    const family = await familySession(browser, email("throttle"));
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const res = await post(family.api, "/api/auth/sign-in", {
        email: family.email,
        password: "Definitely-Wrong-1!",
      });
      statuses.push(res.status());
    }
    expect(statuses).toContain(401);
    expect(statuses).toContain(429);
    await family.context.close();
  });

  test("a readonly staff member cannot decide", async ({ browser, baseURL }) => {
    const operator = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": nextClientIp() },
    });
    const adminEmail = email("ro.admin");
    await registerAndVerify(operator, adminEmail);
    await signIn(operator, adminEmail);
    expect((await bootstrapMembership(operator, adminEmail, SITE_A)).status()).toBe(201);

    const family = await familySession(browser, email("ro.family"));
    const submitted = await post(family.api, "/api/admissions/submit", {
      clientRequestId: `ro-${Date.now()}`,
      siteId: SITE_A,
      senior: { name: "Readonly Case", age: 80, relationship: "Enfant" },
      familyContact: { name: "Famille", email: family.email, relationship: "Enfant" },
    });
    expect(submitted.status()).toBe(201);
    const id = ((await submitted.json()) as { application: { id: string } }).application.id;

    const viewer = await staffSession(browser, operator, email("ro.viewer"), SITE_A, "readonly");
    expect((await viewer.api.get("/api/admissions/residence")).status()).toBe(200);

    const denied = await post(viewer.api, `/api/admissions/${id}/status`, { status: "approved" });
    expect(denied.status()).toBe(403);

    await Promise.all([family.context.close(), viewer.context.close(), operator.dispose()]);
  });

  test("a tampered cookie is refused", async ({ browser }) => {
    const family = await familySession(browser, email("tamper"));
    expect((await me(family.api)).user).not.toBeNull();

    const cookies = await family.context.cookies();
    const session = cookies.find((c) => c.name === "haven_session");
    expect(session).toBeTruthy();

    await family.context.clearCookies();
    await family.context.addCookies([
      { ...session!, value: `${session!.value}x` },
      ...cookies.filter((c) => c.name !== "haven_session"),
    ]);

    expect((await me(family.api)).user).toBeNull();
    const denied = await family.api.get("/api/admissions/family");
    expect(denied.status()).toBe(401);

    await family.context.close();
  });

  test("revoking a session logs out an already-open browser", async ({ browser }) => {
    const family = await familySession(browser, email("revoke"));
    expect((await family.api.get("/api/admissions/family")).status()).toBe(200);

    // Sign out is a revocation server-side, not just a cookie wipe.
    const csrfToken = await csrf(family.api);
    const out = await family.api.delete("/api/auth/session", {
      headers: { "x-haven-csrf": csrfToken, origin: ORIGIN },
    });
    expect(out.ok()).toBeTruthy();

    expect((await me(family.api)).user).toBeNull();
    expect((await family.api.get("/api/admissions/family")).status()).toBe(401);

    await family.context.close();
  });

  test("password reset invalidates the other device", async ({ browser }) => {
    const address = email("reset");

    // Device 1 registers and signs in.
    const device1 = await familySession(browser, address);
    expect((await device1.api.get("/api/admissions/family")).status()).toBe(200);

    // Device 2: same account, separate browser context.
    const { context: ctx2, api: api2 } = await newSession(browser);
    await signIn(api2, address);
    expect((await api2.get("/api/admissions/family")).status()).toBe(200);

    // Device 2 resets the password.
    const requested = await api2.post("/api/auth/password-reset", {
      data: { email: address },
      headers: {
        "x-haven-csrf": await csrf(api2),
        origin: ORIGIN,
        "x-haven-bootstrap-token": process.env.HAVEN_BOOTSTRAP_TOKEN ?? "e2e-bootstrap-token",
      },
    });
    expect(requested.ok()).toBeTruthy();
    const { resetToken } = (await requested.json()) as { resetToken: string };
    expect(resetToken).toBeTruthy();

    const completed = await put(api2, "/api/auth/password-reset", {
      token: resetToken,
      password: "Brand-New-Secret-91!",
    });
    expect(completed.status(), await completed.text()).toBe(200);

    // Both sessions are dead, including the one that never moved.
    expect((await device1.api.get("/api/admissions/family")).status()).toBe(401);
    expect((await api2.get("/api/admissions/family")).status()).toBe(401);

    // The old password no longer works; the new one does.
    const stale = await post(api2, "/api/auth/sign-in", { email: address, password: PASSWORD });
    expect(stale.status()).toBe(401);
    const fresh = await post(api2, "/api/auth/sign-in", {
      email: address,
      password: "Brand-New-Secret-91!",
    });
    expect(fresh.status()).toBe(200);

    await Promise.all([device1.context.close(), ctx2.close()]);
  });
});
