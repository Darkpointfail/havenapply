/**
 * The browser must not be able to grant itself identity or permissions.
 * These are static assertions over the source tree so a regression fails CI.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

async function read(relative: string) {
  return fs.readFile(path.join(SRC, relative), "utf8");
}

describe("identity source", () => {
  it("restores the signed-in user from the server, not from localStorage", async () => {
    const auth = await read("lib/auth.tsx");
    expect(auth).toContain("fetchServerIdentity");
    // `readSession()` read `haven-auth` from localStorage.
    expect(auth).not.toMatch(/\breadSession\(/);
  });

  it("asks the server who the caller is through /api/auth/me", async () => {
    const clientApi = await read("lib/family/client-api.ts");
    expect(clientApi).toContain("/api/auth/me");
  });

  it("cannot re-enable open access from the environment", async () => {
    const openAccess = await read("lib/auth-open-access.ts");
    expect(openAccess).toContain("export const AUTH_OPEN_ACCESS = false as const");
    expect(openAccess).not.toContain("process.env.NEXT_PUBLIC_AUTH_OPEN_ACCESS");
  });

  it("has no client session minting gate left", async () => {
    const config = await read("lib/admissions/config.ts");
    expect(config).not.toContain("clientSessionMintEnabled");
    await expect(fs.stat(path.join(SRC, "app/api/admissions/staff/session/route.ts"))).rejects.toThrow();
  });

  it("refuses the removed client-minted session endpoint", async () => {
    const route = await read("app/api/auth/session/route.ts");
    expect(route).toContain("410");
    expect(route).not.toContain("mintFamilySessionToken");
  });

  it("derives staff site scope from memberships, never from the request", async () => {
    const guards = await read("lib/security/guards.ts");
    expect(guards).toContain("listMembershipsByUser");
    const residence = await read("app/api/admissions/residence/route.ts");
    expect(residence).toContain("scope.siteIds");
    // The requested site is only ever used to narrow, through scopeToSite.
    expect(residence).toContain("resolveStaffSiteScope");
  });
});
