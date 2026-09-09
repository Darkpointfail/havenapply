/**
 * The free self-serve access flow for non-client residences
 * (community/claim/[token]). Two guarantees matter most here:
 * - a site with no staff can be claimed, once, by whoever has the link;
 * - a site that already has active staff can never be re-claimed, even by
 *   someone holding a still-unused, unexpired token for it (the exact
 *   scenario a leaked or forwarded link creates).
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetIdentityForTests,
  consumeSiteClaim,
  createSiteClaim,
  listMembershipsBySite,
  upsertMembership,
} from "@/lib/security/identity-store";

const SITE_ID = "site-claim-test";

beforeEach(async () => {
  await __resetIdentityForTests();
});

describe("site claim", () => {
  it("grants admin on an unclaimed site and marks the token spent", async () => {
    const { token } = await createSiteClaim(SITE_ID);

    const result = await consumeSiteClaim(token, "user-1", "staff@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.siteId).toBe(SITE_ID);

    const memberships = await listMembershipsBySite(SITE_ID);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ userId: "user-1", role: "admin", status: "active" });

    // Same token again: already used.
    const second = await consumeSiteClaim(token, "user-2", "other@example.com");
    expect(second.ok).toBe(false);
  });

  it("refuses to hand out admin on a site that already has active staff", async () => {
    await upsertMembership({
      userId: "existing-admin",
      email: "admin@example.com",
      siteId: SITE_ID,
      role: "admin",
    });

    const { token } = await createSiteClaim(SITE_ID);
    const result = await consumeSiteClaim(token, "stranger", "stranger@example.com");

    expect(result.ok).toBe(false);
    const memberships = await listMembershipsBySite(SITE_ID);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].userId).toBe("existing-admin");
  });
});
