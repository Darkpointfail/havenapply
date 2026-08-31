import type { Residence } from "@/data/family-space";

export type FamilyCareProfile = {
  budgetMax: number;
  sector: string;
  needsNursing: boolean;
  needsBathHelp: boolean;
  needsMobilityHelp: boolean;
  unitPreference: string;
  maxDistanceKm: number;
  autonomyHint: string;
};

/** Neutral defaults when no senior care profile is available — never use demo Marguerite data. */
export const EMPTY_CARE_PROFILE: FamilyCareProfile = {
  budgetMax: Number.POSITIVE_INFINITY,
  sector: "",
  needsNursing: false,
  needsBathHelp: false,
  needsMobilityHelp: false,
  unitPreference: "",
  maxDistanceKm: Number.POSITIVE_INFINITY,
  autonomyHint: "",
};

function affirmativeNeed(raw: string | undefined | null): boolean {
  const v = (raw || "").trim().toLowerCase();
  if (!v || v === "à préciser" || v === "non" || v === "aucune" || v === "autonome") {
    return false;
  }
  if (/^non\b|aucune|pas besoin|indépendant|autonome|sans aide/.test(v)) return false;
  return /oui|aide|besoin|partiel|totale|fauteuil|marchette|bain|hygiène|hygiene|médic|medic|infirm|soin|mobil|supervis|quotidien|assistance/.test(
    v,
  );
}

function parseBudgetMax(raw: string | number | undefined | null): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const text = String(raw ?? "").replace(/\s/g, "").replace(/\$/g, "");
  const match = text.match(/(\d[\d.,]*)/);
  if (!match) return Number.POSITIVE_INFINITY;
  const n = Number(match[1]!.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
}

/**
 * Derive a care-matching profile from the family dossier / senior preferences.
 * Empty or draft dossiers yield EMPTY_CARE_PROFILE (base registry score only).
 */
export function careProfileFromFamilyInputs(input?: {
  ville?: string | null;
  budget?: string | null;
  budgetMax?: string | number | null;
  autonomie?: string | null;
  aideHygiene?: string | null;
  aideMedication?: string | null;
  mobilite?: string | null;
  services?: string | null;
  searchZones?: { query?: string | null }[] | null;
  draft?: boolean;
} | null): FamilyCareProfile {
  if (!input || input.draft) return { ...EMPTY_CARE_PROFILE };

  const zone =
    input.searchZones?.map((z) => z.query?.trim()).find(Boolean) ||
    input.ville?.trim() ||
    "";
  const services = (input.services || "").toLowerCase();
  const autonomie = (input.autonomie || "").trim();
  const needsNursing =
    affirmativeNeed(input.aideMedication) ||
    /infirm|médic|medic|soin/.test(services) ||
    /soin|dépendance|dependance/.test(autonomie.toLowerCase());

  return {
    budgetMax: (() => {
      const fromMax = parseBudgetMax(input.budgetMax);
      if (Number.isFinite(fromMax)) return fromMax;
      return parseBudgetMax(input.budget);
    })(),
    sector: zone,
    needsNursing,
    needsBathHelp: affirmativeNeed(input.aideHygiene) || /bain|hygiène|hygiene/.test(services),
    needsMobilityHelp: affirmativeNeed(input.mobilite) || /mobilité|mobilite/.test(services),
    unitPreference: "",
    maxDistanceKm: Number.POSITIVE_INFINITY,
    autonomyHint: autonomie === "À préciser" ? "" : autonomie,
  };
}

export type ResidenceMatch = {
  score: number;
  tone: "strong" | "good" | "fair" | "low";
  headline: string;
  summary: string;
  why: string[];
  consider: string[];
};

function hasCare(residence: Residence, needle: string) {
  return residence.care.some(
    (c) => c.offered && c.label.toLowerCase().includes(needle.toLowerCase()),
  );
}

function sectorHit(profil: FamilyCareProfile, residence: Residence) {
  const sector = profil.sector.trim().toLowerCase();
  if (!sector) return null;
  const hay = `${residence.city} ${residence.location.address}`.toLowerCase();
  return hay.includes(sector);
}

/**
 * Match a family care profile against an RPA residence card.
 * Produces a score plus a short FR explanation for the establishment fiche.
 */
export function computeMatch(
  profil: FamilyCareProfile = EMPTY_CARE_PROFILE,
  residence: Residence,
): ResidenceMatch {
  let score = residence.compatibilityBase;
  const why: string[] = [...residence.why];
  const consider: string[] = [];

  const inSector = sectorHit(profil, residence);
  if (inSector === true) {
    score += 8;
    why.unshift(`Située dans le secteur recherché (${profil.sector})`);
  } else if (inSector === false) {
    score -= 5;
    consider.push(`Secteur différent de « ${profil.sector} »`);
  }

  if (profil.needsNursing) {
    if (hasCare(residence, "infirmiers") || residence.hasNursingStaff) {
      score += 10;
      why.unshift("Répond au besoin de soins infirmiers");
    } else {
      score -= 12;
      consider.unshift("Soins infirmiers non confirmés alors que votre dossier en a besoin");
    }
  }

  if (profil.needsBathHelp) {
    if (hasCare(residence, "bain")) {
      score += 6;
      why.unshift("Aide au bain déclarée");
    } else {
      score -= 7;
      consider.unshift("Aide au bain non déclarée au registre");
    }
  }

  if (profil.needsMobilityHelp) {
    if (hasCare(residence, "mobilité")) {
      score += 5;
      why.unshift("Aide à la mobilité déclarée");
    } else {
      score -= 5;
      consider.push("Aide à la mobilité non déclarée");
    }
  }

  if (profil.autonomyHint) {
    const hint = profil.autonomyHint.toLowerCase();
    const cat = (residence.categoryLabel || "").toLowerCase();
    if (hint.includes("soin") && cat.includes("catégorie 4")) score += 4;
    if (hint.includes("semi") && (cat.includes("catégorie 2") || cat.includes("catégorie 3"))) {
      score += 3;
    }
  }

  if (Number.isFinite(profil.budgetMax) && residence.priceAmount > 0) {
    if (residence.priceAmount > profil.budgetMax) {
      score -= 6;
      consider.push("Tarif indicatif au-dessus du budget indiqué");
    } else if (residence.priceAmount <= profil.budgetMax * 0.9) {
      score += 2;
    }
  }

  // Always keep the transparency notes
  for (const c of residence.consider) {
    if (!consider.includes(c)) consider.push(c);
  }

  score = Math.max(28, Math.min(98, Math.round(score)));

  const tone: ResidenceMatch["tone"] =
    score >= 80 ? "strong" : score >= 65 ? "good" : score >= 50 ? "fair" : "low";

  const headline =
    tone === "strong"
      ? "Très bonne correspondance"
      : tone === "good"
        ? "Bonne correspondance"
        : tone === "fair"
          ? "Correspondance partielle"
          : "Correspondance limitée";

  const topWhy = why.slice(0, 3).join(", ");
  const topConsider = consider.slice(0, 2).join(" ; ");

  const summary =
    tone === "strong" || tone === "good"
      ? `${residence.name} semble bien coller à votre dossier${topWhy ? ` : ${topWhy}` : "."}${
          topConsider ? ` À vérifier : ${topConsider}.` : ""
        }`
      : `${residence.name} ne couvre qu’une partie de vos besoins${
          topConsider ? ` — ${topConsider}` : ""
        }.${topWhy ? ` Points favorables : ${topWhy}.` : ""}`;

  return {
    score,
    tone,
    headline,
    summary,
    why: Array.from(new Set(why)).slice(0, 5),
    consider: Array.from(new Set(consider)).slice(0, 4),
  };
}
