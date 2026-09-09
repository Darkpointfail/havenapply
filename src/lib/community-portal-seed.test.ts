import { describe, expect, test } from "vitest";
import { seedCommunityWorkspace } from "@/lib/community-portal";

describe("seedCommunityWorkspace", () => {
  test("a curated demo residence still gets its full demo team and applications", () => {
    const ws = seedCommunityWorkspace("maple-grove");
    expect(ws.residenceId).toBe("maple-grove");
    expect(ws.team.length).toBeGreaterThan(0);
    expect(ws.team.some((t) => t.name === "Jordan Lee")).toBe(true);
    expect(ws.applications.length).toBeGreaterThan(0);
  });

  test("an unknown / real self-serve-claimed residence never inherits Maple Grove's demo content", () => {
    const ws = seedCommunityWorkspace("some-real-rpa-site-id-not-in-catalog");
    expect(ws.residenceId).toBe("some-real-rpa-site-id-not-in-catalog");
    expect(ws.team).toEqual([]);
    expect(ws.applications).toEqual([]);
    expect(ws.patientTransfers).toEqual([]);
    expect(ws.availability).toEqual([]);
    // No leaked demo staff names anywhere in the workspace.
    const serialized = JSON.stringify(ws);
    expect(serialized).not.toMatch(/Jordan Lee|Sofia Nguyen|Marcus Hale|Priya Shah|Alex Kim/);
    expect(serialized).not.toMatch(/Eleanor Martin|Robert Chen|Frank Delgado/);
  });
});
