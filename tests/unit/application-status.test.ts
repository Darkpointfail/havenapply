import { describe, expect, it } from "vitest";
import {
  allowedStaffTargets,
  canTransition,
  isEditableDraft,
  isReopenTransition,
  isTerminalStatus,
  staffVisibleStatuses,
  transitionActorForRole,
} from "@/lib/application-status";
import {
  applicationSubmitPayloadSchema,
  computeDraftProgress,
} from "@/lib/application-schema";
import { generateApplicationPublicRef } from "@/lib/application-ref";

describe("application status machine", () => {
  it("allows family DRAFT → SUBMITTED and withdraw from open statuses", () => {
    expect(canTransition("DRAFT", "SUBMITTED", "FAMILY")).toBe(true);
    expect(canTransition("SUBMITTED", "WITHDRAWN", "FAMILY")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "WITHDRAWN", "FAMILY")).toBe(true);
    expect(canTransition("NEEDS_DOCUMENTS", "WITHDRAWN", "FAMILY")).toBe(true);
    expect(canTransition("WAITLISTED", "WITHDRAWN", "FAMILY")).toBe(true);
    expect(canTransition("NEEDS_DOCUMENTS", "UNDER_REVIEW", "FAMILY")).toBe(true);
  });

  it("blocks family from staff-only decisions", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW", "FAMILY")).toBe(false);
    expect(canTransition("UNDER_REVIEW", "ACCEPTED", "FAMILY")).toBe(false);
    expect(canTransition("UNDER_REVIEW", "REJECTED", "FAMILY")).toBe(false);
    expect(canTransition("DRAFT", "ACCEPTED", "FAMILY")).toBe(false);
  });

  it("allows every permitted staff edge from SUBMITTED", () => {
    for (const to of [
      "UNDER_REVIEW",
      "NEEDS_DOCUMENTS",
      "WAITLISTED",
      "ACCEPTED",
      "REJECTED",
    ] as const) {
      expect(canTransition("SUBMITTED", to, "STAFF")).toBe(true);
    }
  });

  it("allows every permitted staff edge from UNDER_REVIEW", () => {
    for (const to of [
      "NEEDS_DOCUMENTS",
      "WAITLISTED",
      "ACCEPTED",
      "REJECTED",
    ] as const) {
      expect(canTransition("UNDER_REVIEW", to, "STAFF")).toBe(true);
    }
  });

  it("allows NEEDS_DOCUMENTS → UNDER_REVIEW and WAITLISTED branches", () => {
    expect(canTransition("NEEDS_DOCUMENTS", "UNDER_REVIEW", "STAFF")).toBe(true);
    expect(canTransition("WAITLISTED", "UNDER_REVIEW", "STAFF")).toBe(true);
    expect(canTransition("WAITLISTED", "ACCEPTED", "STAFF")).toBe(true);
    expect(canTransition("WAITLISTED", "REJECTED", "STAFF")).toBe(true);
  });

  it("forbids invalid staff transitions", () => {
    expect(canTransition("SUBMITTED", "DRAFT", "STAFF")).toBe(false);
    expect(canTransition("ACCEPTED", "REJECTED", "STAFF")).toBe(false);
    expect(canTransition("REJECTED", "ACCEPTED", "STAFF")).toBe(false);
    expect(canTransition("ACCEPTED", "UNDER_REVIEW", "STAFF")).toBe(false);
    expect(canTransition("ACCEPTED", "UNDER_REVIEW", "STAFF", { allowReopen: true })).toBe(
      true,
    );
    expect(isReopenTransition("ACCEPTED", "UNDER_REVIEW")).toBe(true);
    expect(isReopenTransition("REJECTED", "UNDER_REVIEW")).toBe(true);
  });

  it("blocks staff from creating or submitting drafts", () => {
    expect(canTransition("DRAFT", "SUBMITTED", "STAFF")).toBe(false);
  });

  it("lets admin use family and staff transitions", () => {
    expect(canTransition("DRAFT", "SUBMITTED", "ADMIN")).toBe(true);
    expect(canTransition("SUBMITTED", "UNDER_REVIEW", "ADMIN")).toBe(true);
  });

  it("maps roles and helpers", () => {
    expect(transitionActorForRole("FAMILY")).toBe("FAMILY");
    expect(transitionActorForRole("STAFF")).toBe("STAFF");
    expect(transitionActorForRole("ADMIN")).toBe("ADMIN");
    expect(isEditableDraft("DRAFT")).toBe(true);
    expect(isTerminalStatus("ACCEPTED")).toBe(true);
    expect(staffVisibleStatuses()).not.toContain("DRAFT");
    expect(allowedStaffTargets("SUBMITTED")).toContain("UNDER_REVIEW");
    expect(allowedStaffTargets("ACCEPTED")).toEqual([]);
  });
});

describe("application schema", () => {
  it("requires consents and core fields for submit", () => {
    const ok = applicationSubmitPayloadSchema.safeParse({
      residentPreferredName: "Marie",
      residentBirthYear: 1940,
      contactName: "Jean",
      contactEmail: "jean@example.com",
      contactPhone: "+14185550100",
      consentPrivacy: true,
      consentShareWithSite: true,
    });
    expect(ok.success).toBe(true);

    const missing = applicationSubmitPayloadSchema.safeParse({
      residentPreferredName: "Marie",
      residentBirthYear: 1940,
      contactName: "Jean",
      contactEmail: "jean@example.com",
      contactPhone: "+14185550100",
      consentPrivacy: false,
      consentShareWithSite: true,
    });
    expect(missing.success).toBe(false);
  });

  it("computes draft progress", () => {
    const empty = computeDraftProgress({});
    expect(empty.percent).toBe(0);
    const full = computeDraftProgress({
      siteId: "s1",
      residentPreferredName: "Marie",
      residentBirthYear: 1940,
      contactName: "Jean",
      contactEmail: "a@b.c",
      contactPhone: "555-0100",
      consentPrivacy: true,
      consentShareWithSite: true,
    });
    expect(full.complete).toBe(true);
    expect(full.percent).toBe(100);
  });
});

describe("public ref", () => {
  it("generates HA-XXXXXXXX non-sequential refs", () => {
    const a = generateApplicationPublicRef();
    const b = generateApplicationPublicRef();
    expect(a).toMatch(/^HA-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(b).toMatch(/^HA-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(a).not.toBe(b);
  });
});
