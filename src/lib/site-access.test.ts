import { afterEach, describe, expect, it, vi } from "vitest";
import { isSiteAccessPublicPath, siteAccessEnabled } from "@/lib/site-access";

describe("site launch gate", () => {
  afterEach(() => vi.useRealTimers());

  it("fails closed before launch and opens on October 1 in Montréal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T23:59:59-04:00"));
    expect(siteAccessEnabled()).toBe(true);
    vi.setSystemTime(new Date("2026-10-01T00:00:00-04:00"));
    expect(siteAccessEnabled()).toBe(false);
  });

  it("leaves only the gate page and its unlock endpoint public", () => {
    expect(isSiteAccessPublicPath("/site-access")).toBe(true);
    expect(isSiteAccessPublicPath("/api/site-access")).toBe(true);
    expect(isSiteAccessPublicPath("/")).toBe(false);
    expect(isSiteAccessPublicPath("/media")).toBe(false);
    expect(isSiteAccessPublicPath("/community/sign-in")).toBe(false);
  });
});
