import { describe, expect, it } from "vitest";
import { RESIDENCES } from "@/data/rpa-quebec";
import {
  careProfileFromFamilyInputs,
  computeMatch,
  EMPTY_CARE_PROFILE,
} from "@/lib/family-residence-match";

describe("careProfileFromFamilyInputs", () => {
  it("returns empty profile for draft or missing dossier", () => {
    expect(careProfileFromFamilyInputs(null)).toEqual(EMPTY_CARE_PROFILE);
    expect(careProfileFromFamilyInputs({ draft: true, ville: "Québec" })).toEqual(
      EMPTY_CARE_PROFILE,
    );
  });

  it("maps hygiene, mobility, nursing and sector from the dossier", () => {
    const profile = careProfileFromFamilyInputs({
      ville: "Lévis",
      budgetMax: "3200",
      autonomie: "Semi-autonome",
      aideHygiene: "Aide partielle au bain",
      aideMedication: "Supervision quotidienne",
      mobilite: "Marchette",
      searchZones: [{ query: "Sillery" }],
    });
    expect(profile.sector).toBe("Sillery");
    expect(profile.budgetMax).toBe(3200);
    expect(profile.needsBathHelp).toBe(true);
    expect(profile.needsNursing).toBe(true);
    expect(profile.needsMobilityHelp).toBe(true);
    expect(profile.autonomyHint).toBe("Semi-autonome");
  });
});

describe("computeMatch", () => {
  it("produces a score and FR summary for every residence", () => {
    const sample = RESIDENCES.find((r) => r.hasNursingStaff) ?? RESIDENCES[0]!;
    const match = computeMatch(EMPTY_CARE_PROFILE, sample);
    expect(match.score).toBeGreaterThanOrEqual(28);
    expect(match.score).toBeLessThanOrEqual(98);
    expect(match.headline.length).toBeGreaterThan(5);
    expect(match.summary).toContain(sample.name);
  });

  it("boosts nursing residences when the dossier needs nursing", () => {
    const nursing = RESIDENCES.find((r) => r.hasNursingStaff);
    const without = RESIDENCES.find((r) => !r.hasNursingStaff);
    expect(nursing && without).toBeTruthy();
    const profil = careProfileFromFamilyInputs({
      aideMedication: "Soins infirmiers requis",
      ville: "Québec",
    });
    const withScore = computeMatch(profil, nursing!);
    const withoutScore = computeMatch(profil, without!);
    expect(withScore.score).toBeGreaterThan(withoutScore.score);
    expect(withScore.why.some((w) => /infirm/i.test(w))).toBe(true);
    expect(withoutScore.consider.some((c) => /infirm/i.test(c))).toBe(true);
  });
});
