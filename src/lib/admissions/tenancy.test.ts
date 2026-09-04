/**
 * Cross-tenant isolation at the repository boundary.
 * These are the IDOR cases: they must fail even if the UI would allow them.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAdmissionsForTests,
  changeStatus,
  getDetail,
  listForFamily,
  listForSites,
  submitApplication,
  upsertSite,
} from "@/lib/admissions/local-store";
import type { AdmissionSubmitInput } from "@/lib/admissions/types";

const SITE_A = "site-a";
const SITE_B = "site-b";

function input(overrides: Partial<AdmissionSubmitInput> = {}): AdmissionSubmitInput {
  return {
    clientRequestId: "req-1",
    siteId: SITE_A,
    senior: { name: "Jeanne Test", age: 81, relationship: "Enfant", photoUrl: null },
    summary: "Recherche une place",
    careNeeds: ["Aide au bain"],
    medicalHighlights: [],
    documents: [],
    familyContact: {
      name: "Famille A",
      email: "famille.a@example.com",
      phone: "",
      relationship: "Enfant",
    },
    desiredMoveIn: null,
    ...overrides,
  };
}

beforeEach(async () => {
  await __resetAdmissionsForTests();
  await upsertSite({ id: SITE_A, name: "Résidence A", isActive: true });
  await upsertSite({ id: SITE_B, name: "Résidence B", isActive: true });
});

describe("submission", () => {
  it("is idempotent on the client request id", async () => {
    const first = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });
    const second = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });

    expect(first.ok && first.data.created).toBe(true);
    expect(second.ok && second.data.created).toBe(false);
    if (first.ok && second.ok) {
      expect(second.data.record.id).toBe(first.data.record.id);
    }
    expect(await listForFamily("family-a")).toHaveLength(1);
  });

  it("refuses an inactive residence", async () => {
    await upsertSite({ id: SITE_B, name: "Résidence B", isActive: false });
    const result = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input({ siteId: SITE_B, clientRequestId: "req-inactive" }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("starts from an empty store with no demo dossier", async () => {
    expect(await listForSites([SITE_A, SITE_B])).toHaveLength(0);
  });
});

describe("cross-tenant reads", () => {
  it("hides one family's application from another family", async () => {
    const created = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.data.record.id;

    expect(await getDetail({ applicationId: id, familyUserId: "family-a" })).not.toBeNull();
    expect(await getDetail({ applicationId: id, familyUserId: "family-b" })).toBeNull();
    expect(await listForFamily("family-b")).toHaveLength(0);
  });

  it("shows the application to the targeted site only", async () => {
    const created = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });
    if (!created.ok) throw new Error("submit failed");
    const id = created.data.record.id;

    expect(await listForSites([SITE_A])).toHaveLength(1);
    expect(await listForSites([SITE_B])).toHaveLength(0);
    expect(await getDetail({ applicationId: id, siteIds: [SITE_A] })).not.toBeNull();
    expect(await getDetail({ applicationId: id, siteIds: [SITE_B] })).toBeNull();
  });

  it("refuses a status change from another site's staff", async () => {
    const created = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });
    if (!created.ok) throw new Error("submit failed");
    const id = created.data.record.id;

    const wrongSite = await changeStatus({
      applicationId: id,
      siteIds: [SITE_B],
      toStatus: "approved",
      actorId: "staff-b",
      actorLabel: "Staff B",
    });
    expect(wrongSite.ok).toBe(false);
    if (!wrongSite.ok) expect(wrongSite.status).toBe(404);

    const rightSite = await changeStatus({
      applicationId: id,
      siteIds: [SITE_A],
      toStatus: "approved",
      actorId: "staff-a",
      actorLabel: "Staff A",
    });
    expect(rightSite.ok).toBe(true);
  });

  it("keeps drafts out of the residence listing", async () => {
    const { saveDraft } = await import("@/lib/admissions/local-store");
    await saveDraft({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input({ clientRequestId: "draft-1" }),
    });
    expect(await listForFamily("family-a")).toHaveLength(1);
    expect(await listForSites([SITE_A])).toHaveLength(0);
  });
});

describe("status history and audit", () => {
  it("writes one event and one audit entry per transition", async () => {
    const created = await submitApplication({
      familyUserId: "family-a",
      familyEmail: "famille.a@example.com",
      input: input(),
    });
    if (!created.ok) throw new Error("submit failed");
    const id = created.data.record.id;

    await changeStatus({
      applicationId: id,
      siteIds: [SITE_A],
      toStatus: "under_review",
      actorId: "staff-a",
      actorLabel: "Staff A",
      note: "Dossier ouvert",
    });

    const detail = await getDetail({ applicationId: id, siteIds: [SITE_A] });
    expect(detail).not.toBeNull();
    expect(detail!.statusEvents.map((e) => e.toStatus)).toEqual(["submitted", "under_review"]);
    expect(detail!.audit.map((a) => a.action)).toEqual([
      "application.submitted",
      "status.under_review",
    ]);
    expect(detail!.statusEvents[1].actorType).toBe("staff");
  });
});
