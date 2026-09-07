/**
 * Regression guard for the authorization surface.
 *
 * A new route must not be able to ship without a CSRF check and an identity
 * guard: the review that caught 15 unprotected mutations should not have to
 * happen twice.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const API = path.join(process.cwd(), "src", "app", "api");

/** Public by design: no session, nothing personal returned. */
const PUBLIC_ROUTES = new Set([
  "communities/route.ts",
  "communities/[id]/route.ts",
  "site-access/route.ts",
  "auth/csrf/route.ts",
  "auth/sign-in/route.ts",
  "auth/sign-up/route.ts",
  "auth/register/route.ts",
  "auth/verify-email/route.ts",
  "auth/password-reset/route.ts",
  "auth/me/route.ts",
  "auth/session/route.ts",
  "staff/invitations/accept/route.ts",
  "staff/bootstrap/route.ts",
  "admissions/seed/route.ts",
]);

type Route = { rel: string; source: string };

let routes: Route[] = [];

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name === "route.ts" ? [full] : [];
    }),
  );
  return nested.flat();
}

beforeAll(async () => {
  const files = await walk(API);
  routes = await Promise.all(
    files.map(async (file) => ({
      rel: path.relative(API, file),
      source: await fs.readFile(file, "utf8"),
    })),
  );
});

const MUTATING = /export async function (POST|PUT|PATCH|DELETE)\b/;

describe("route authorization coverage", () => {
  it("finds the API surface", () => {
    expect(routes.length).toBeGreaterThan(15);
  });

  it("checks CSRF on every cookie-authenticated mutation", () => {
    // The staging shutter runs before any session exists and carries no
    // personal data, so it has no session cookie to protect.
    const preAuth = new Set(["site-access/route.ts"]);
    const missing = routes
      .filter((r) => !preAuth.has(r.rel.split(path.sep).join("/")))
      .filter((r) => MUTATING.test(r.source) && !r.source.includes("requireCsrf"))
      .map((r) => r.rel);
    expect(missing).toEqual([]);
  });

  it("resolves identity through a central guard on every non-public route", () => {
    const guards = [
      "requireFamilyUser",
      "requireFamilyActor",
      "requireStaffActor",
      "requireStaff",
      "requireAdmin",
      "currentPrincipal",
      "operatorTokenMatches",
    ];
    const missing = routes
      .filter((r) => !PUBLIC_ROUTES.has(r.rel.split(path.sep).join("/")))
      .filter((r) => !guards.some((guard) => r.source.includes(guard)))
      .map((r) => r.rel);
    expect(missing).toEqual([]);
  });

  it("never reads an identity field straight from the request body", () => {
    // A role *granted* to someone else (registration, invitation) is validated
    // against an allowlist; what must never be trusted is who the caller is.
    const forbidden = [/body\.userId/, /body\.familyId/, /body\.ownerId/, /body\.principal/];
    const offenders: string[] = [];
    for (const route of routes) {
      // The seed and bootstrap endpoints provision accounts by design and are
      // operator-gated; every other route must derive identity from the session.
      if (route.rel.includes("seed") || route.rel.includes("bootstrap")) continue;
      for (const pattern of forbidden) {
        if (pattern.test(route.source)) offenders.push(`${route.rel}: ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("forces self-registration to the family role", async () => {
    const register = routes.find((r) => r.rel.split(path.sep).join("/") === "auth/register/route.ts");
    expect(register).toBeTruthy();
    expect(register!.source).toContain('role !== "family"');
  });

  it("gates operator capabilities behind the shared production check", () => {
    const operatorRoutes = routes.filter((r) => r.source.includes("operatorTokenMatches"));
    expect(operatorRoutes.length).toBeGreaterThan(0);
    for (const route of operatorRoutes) {
      expect(route.source).toContain('from "@/lib/security/operator"');
    }
  });

  it("never returns a verification, reset or invitation token on a NODE_ENV guess", () => {
    const offenders = routes
      .filter((r) => /token/i.test(r.source) && /NODE_ENV !== "production"/.test(r.source))
      .map((r) => r.rel);
    expect(offenders).toEqual([]);
  });
});
