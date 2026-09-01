import { describe, expect, it } from "vitest";
import { RESIDENCES } from "@/data/rpa-quebec";
import {
  careProfileFromFamilyInputs,
  computeMatch,
  EMPTY_CARE_PROFILE,
  getMatchReadiness,
  residenceAutonomyBand,
} from "@/lib/family-residence-match";

describe("getMatchReadiness", () => {
  it("requires autonomy, sector and budget before scoring", () => {
    expect(getMatchReadiness(EMPTY_CARE_PROFILE).ready).toBe(false);
    expect(getMatchReadiness(EMPTY_CARE_PROFILE).missing.length).toBeGreaterThan(0);

    const partial = careProfileFromFamilyInputs({
      autonomyScore: 4,
      searchCriteria: { sector: "Québec", budgetMax: null },
    });
    expect(getMatchReadiness(partial).ready).toBe(false);
    expect(getMatchReadiness(partial).missing).toContain("Max monthly budget");

    const ready = careProfileFromFamilyInputs({
      autonomyScore: 4,
      searchCriteria: { sector: "Québec", budgetMax: 3200 },
    });
    expect(getMatchReadiness(ready).ready).toBe(true);
    expect(getMatchReadiness(ready).missing).toEqual([]);
  });
});

describe("careProfileFromFamilyInputs", () => {
  it("applies search criteria even on draft dossiers", () => {
    const profile = careProfileFromFamilyInputs({
      draft: true,
      searchCriteria: { sector: "Montréal", budgetMax: 3000 },
    });
    expect(profile.search.sector).toBe("Montréal");
    expect(profile.search.budgetMax).toBe(3000);
  });
});

describe("computeMatch", () => {
  it("scores low-autonomy patients poorly against autonomous residences", () => {
    const autonomous = RESIDENCES.find((r) => {
      const band = residenceAutonomyBand(r);
      return band.lo >= 7 && !r.hasNursingStaff;
    });
    const careHeavy = RESIDENCES.find((r) => r.hasNursingStaff);
    expect(autonomous && careHeavy).toBeTruthy();
    const profil = careProfileFromFamilyInputs({
      autonomyScore: 2,
      aideMedication: "Soins infirmiers requis",
      searchCriteria: {
        sector: "Québec",
        budgetMax: 4000,
        priorities: { care: 5, geo: 1, budget: 1, size: 1, rating: 1 },
      },
    });
    expect(computeMatch(profil, autonomous!).score).toBeLessThan(
      computeMatch(profil, careHeavy!).score,
    );
  });
});
