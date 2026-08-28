import type { Residence } from "@/data/family-space";
import { MARGUERITE_PROFILE } from "@/data/family-space";

export type FamilyCareProfile = {
  budgetMax: number;
  sector: string;
  needsNursing: boolean;
  needsBathHelp: boolean;
  unitPreference: string;
  maxDistanceKm: number;
};

export type ResidenceMatch = {
  score: number;
  why: string[];
  consider: string[];
};

/**
 * Isolated match helper. Today it returns curated mock signals attached to each
 * residence, with a light adjustment from the family profile so a real engine
 * can replace this later without changing call sites.
 */
export function computeMatch(
  profil: FamilyCareProfile = MARGUERITE_PROFILE,
  residence: Residence,
): ResidenceMatch {
  let score = residence.compatibilityBase;

  if (residence.priceAmount > profil.budgetMax) score -= 6;
  else if (residence.priceAmount <= profil.budgetMax * 0.9) score += 2;

  if (residence.distanceKm > profil.maxDistanceKm) score -= 5;
  else if (residence.distanceKm <= 15) score += 1;

  if (profil.needsNursing && !residence.care.some((c) => c.label.includes("infirmiers") && c.offered)) {
    score -= 4;
  }
  if (profil.needsBathHelp && !residence.care.some((c) => c.label.includes("bain") && c.offered)) {
    score -= 3;
  }

  score = Math.max(35, Math.min(99, Math.round(score)));

  return {
    score,
    why: residence.why,
    consider: residence.consider,
  };
}
