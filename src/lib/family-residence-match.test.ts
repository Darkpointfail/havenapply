import { describe, expect, it } from "vitest";
import { RESIDENCES } from "@/data/rpa-quebec";
import {
  careProfileFromFamilyInputs,
  computeMatch,
  EMPTY_CARE_PROFILE,
  residenceAutonomyBand,
  resolveWeights,
  DEFAULT_PRIORITIES,
} from "@/lib/family-residence-match";

describe("careProfileFromFamilyInputs", () => {
  it("returns empty profile for draft or missing dossier", () => {
    expect(careProfileFromFamilyInputs(null).autonomyScore).toBeNull();
    expect(careProfileFromFamilyInputs({ draft: true, ville: "Québec" }).sector).toBe("");
  });

  it("maps autonomy score, hygiene, mobility, nursing and search priorities", () => {
    const profile = careProfileFromFamilyInputs({
      ville: "Lévis",
      budgetMax: "3200",
      autonomyScore: 4,
      autonomie: "4/10 — peu autonome",
      aideHygiene: "Aide partielle au bain",
      aideMedication: "Supervision quotidienne",
      mobilite: "Marchette",
      searchCriteria: {
        sector: "Sillery",
        size: "small",
        budgetMax: 3200,
        priorities: { care: 5, geo: 2, budget: 4, size: 3, rating: 1 },
      },
    });
    expect(profile.sector).toBe("Sillery");
    expect(profile.autonomyScore).toBe(4);
    expect(profile.budgetMax).toBe(3200);
    expect(profile.needsBathHelp).toBe(true);
    expect(profile.needsNursing).toBe(true);
    expect(profile.needsMobilityHelp).toBe(true);
    expect(profile.search.size).toBe("small");
    expect(profile.search.priorities.care).toBe(5);
    expect(profile.search.priorities.geo).toBe(2);
  });
});

describe("resolveWeights", () => {
  it("renormalizes when an axis is unavailable", () => {
    const w = resolveWeights(DEFAULT_PRIORITIES, {
      rating: false,
      budget: false,
      size: false,
    });
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(w.rating).toBe(0);
    expect(w.budget).toBe(0);
    expect(w.care).toBeGreaterThan(w.geo);
  });
});

describe("computeMatch weighted autonomy", () => {
  it("produces a score, axes and FR summary for every residence", () => {
    const sample = RESIDENCES.find((r) => r.hasNursingStaff) ?? RESIDENCES[0]!;
    const match = computeMatch(EMPTY_CARE_PROFILE, sample);
    expect(match.score).toBeGreaterThanOrEqual(5);
    expect(match.score).toBeLessThanOrEqual(98);
    expect(match.axes.length).toBeGreaterThan(0);
    expect(match.summary).toContain(sample.name);
  });

  it("scores low when a low-autonomy patient meets a fully autonomous residence", () => {
    const autonomous = RESIDENCES.find((r) => {
      const band = residenceAutonomyBand(r);
      return band.lo >= 7 && !r.hasNursingStaff;
    });
    const careHeavy = RESIDENCES.find((r) => {
      const band = residenceAutonomyBand(r);
      return band.hi <= 4 || r.hasNursingStaff;
    });
    expect(autonomous && careHeavy).toBeTruthy();

    const profil = careProfileFromFamilyInputs({
      autonomyScore: 2,
      mobilite: "Fauteuil roulant",
      aideMedication: "Soins infirmiers requis",
      searchCriteria: {
        priorities: { care: 5, geo: 1, budget: 1, size: 1, rating: 1 },
      },
    });

    const lowFit = computeMatch(profil, autonomous!);
    const highFit = computeMatch(profil, careHeavy!);
    expect(lowFit.score).toBeLessThan(highFit.score);
    expect(lowFit.score).toBeLessThan(55);
    expect(lowFit.consider.some((c) => /autonomie|infirm/i.test(c))).toBe(true);
  });

  it("boosts nursing residences when the dossier needs nursing", () => {
    const nursing = RESIDENCES.find((r) => r.hasNursingStaff);
    const without = RESIDENCES.find((r) => !r.hasNursingStaff);
    expect(nursing && without).toBeTruthy();
    const profil = careProfileFromFamilyInputs({
      aideMedication: "Soins infirmiers requis",
      autonomyScore: 3,
      ville: "Québec",
      searchCriteria: {
        priorities: { care: 5, geo: 1, budget: 1, size: 1, rating: 1 },
      },
    });
    const withScore = computeMatch(profil, nursing!);
    const withoutScore = computeMatch(profil, without!);
    expect(withScore.score).toBeGreaterThan(withoutScore.score);
  });
});
