import { describe, expect, it, beforeEach } from "vitest";
import {
  displayApplicationRef,
  ensureApplicationPublicRef,
  formatApplicationRef,
  formatDossierRef,
  formatPersonRef,
  isApplicationPublicRef,
  nextApplicationRef,
  resetPublicRefSequencesForTests,
  residencePublicCode,
} from "@/lib/public-refs";

describe("public-refs", () => {
  beforeEach(() => {
    resetPublicRefSequencesForTests();
  });

  it("formats refs", () => {
    expect(formatPersonRef(217)).toBe("HA-P-00217");
    expect(formatDossierRef(482, 2026)).toBe("HA-D-2026-00482");
    expect(formatApplicationRef(1903, 2026)).toBe("HA-A-2026-01903");
  });

  it("maps RPA catalog ids", () => {
    expect(residencePublicCode("rpa-1428")).toBe("RPA-1428");
    expect(residencePublicCode("RPA-99")).toBe("RPA-99");
    expect(residencePublicCode("maple-grove")).toBe("HA-R-MAPLE-GROVE");
  });

  it("allocates monotonic application refs", () => {
    const a = nextApplicationRef(2026);
    const b = nextApplicationRef(2026);
    expect(isApplicationPublicRef(a)).toBe(true);
    expect(isApplicationPublicRef(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("keeps an existing publicRef stable", () => {
    const first = ensureApplicationPublicRef({});
    const second = ensureApplicationPublicRef(first);
    expect(second.publicRef).toBe(first.publicRef);
  });

  it("displayApplicationRef prefers HA-A", () => {
    expect(displayApplicationRef({ publicRef: "HA-A-2026-00001", id: "app-x" })).toBe(
      "HA-A-2026-00001",
    );
  });
});
