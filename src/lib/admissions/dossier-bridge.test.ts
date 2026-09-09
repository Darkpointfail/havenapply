/**
 * Regression test for the family-dossier -> residence-console bridge.
 * Guards against the exact bug found in this pass: the rich clinical/
 * situation/housing dossier a family fills in (ResidentDossier) failing to
 * reach the residence's DossierView, silently dropped at any of three
 * points — the family-side mapper, the server's request validator, or the
 * local-store record writer.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { emptyResidentDossier, residentDossierToClientDossier } from "@/lib/resident-dossier";
import { parseSubmitInput } from "@/lib/admissions/validation";
import {
  __resetAdmissionsForTests,
  submitApplication,
  upsertSite,
} from "@/lib/admissions/local-store";
import type { AdmissionSubmitInput } from "@/lib/admissions/types";

const SITE_ID = "site-bridge-test";

function baseInput(dossier: Record<string, unknown>): AdmissionSubmitInput {
  return {
    clientRequestId: "req-bridge-1",
    siteId: SITE_ID,
    senior: { name: "Jeanne Test", age: 82, relationship: "Fille", photoUrl: null },
    summary: "Recherche une place",
    careNeeds: [],
    medicalHighlights: [],
    documents: [],
    familyContact: {
      name: "Famille Test",
      email: "famille.test@example.com",
      phone: "",
      relationship: "Fille",
    },
    desiredMoveIn: null,
    dossier,
  };
}

beforeEach(async () => {
  await __resetAdmissionsForTests();
  await upsertSite({ id: SITE_ID, name: "Résidence Test", isActive: true });
});

describe("family dossier reaches the residence console", () => {
  it("carries medications, allergies and ADLs from the wizard through submission", async () => {
    const rd = {
      ...emptyResidentDossier(),
      currentMedications: "Metformine 500mg, Amlodipine 5mg",
      medicationAllergies: "Sulfamides",
      diagnoses: "Diabète type 2, Hypertension",
      adls: {
        bathing: "hands_on",
        dressing: "",
        toileting: "",
        eating: "independent",
        walking: "",
        transfers: "",
      },
    };

    // Step 1: family-side bridge (this pass's fix).
    const dossierPayload = residentDossierToClientDossier(rd);
    expect(dossierPayload.medications).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Metformine 500mg" })]),
    );

    // Step 2: the exact server boundary the object silently crossed before
    // this fix — JSON round-trip through the request validator.
    const wire = JSON.parse(JSON.stringify(baseInput(dossierPayload)));
    const parsed = parseSubmitInput(wire);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.dossier?.medications).toBeTruthy();
    expect(parsed.value.dossier?.allergies).toBeTruthy();
    expect(parsed.value.dossier?.pathologies).toBeTruthy();

    // Step 3: local-store persistence — the record the residence console reads.
    const result = await submitApplication({
      familyUserId: "fam-bridge-1",
      familyEmail: "famille.test@example.com",
      input: parsed.value,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.record.dossier?.medications).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Metformine 500mg" })]),
    );
    expect(result.data.record.dossier?.allergies).toEqual(
      expect.arrayContaining([expect.objectContaining({ substance: "Sulfamides" })]),
    );
  });

  it("does not fabricate a dossier when the family submits nothing", async () => {
    const wire = JSON.parse(
      JSON.stringify({ ...baseInput({}), dossier: null }),
    );
    const parsed = parseSubmitInput(wire);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await submitApplication({
      familyUserId: "fam-bridge-2",
      familyEmail: "famille.test@example.com",
      input: { ...parsed.value, clientRequestId: "req-bridge-2" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.record.dossier ?? null).toBeFalsy();
  });
});
