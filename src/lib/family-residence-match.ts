import type { Residence } from "@/data/family-space";

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;
const identityT: TranslateFn = (key) => key;

/** Importance 1–5 per axis; converted into normalized weights at score time. */
export type MatchPriorities = {
  care: number;
  geo: number;
  budget: number;
  size: number;
  rating: number;
};

export type ResidenceSizePreference = "any" | "small" | "medium" | "large";

/** What the family is looking for (distinct from the patient care dossier). */
export type FamilySearchCriteria = {
  sector: string;
  radiusKm: number;
  budgetMax: number | null;
  size: ResidenceSizePreference;
  minGoogleRating: number | null;
  priorities: MatchPriorities;
};

export type FamilyCareProfile = {
  budgetMax: number;
  sector: string;
  needsNursing: boolean;
  needsBathHelp: boolean;
  needsMobilityHelp: boolean;
  unitPreference: string;
  maxDistanceKm: number;
  autonomyHint: string;
  /** 1 = not autonomous at all · 10 = fully autonomous. Null = unknown. */
  autonomyScore: number | null;
  search: FamilySearchCriteria;
};

export const DEFAULT_PRIORITIES: MatchPriorities = {
  care: 5,
  geo: 4,
  budget: 3,
  size: 2,
  rating: 2,
};

/** Base share before user priority multipliers (sums to 1). */
export const DEFAULT_MATCH_WEIGHTS = {
  care: 0.35,
  geo: 0.25,
  budget: 0.15,
  size: 0.1,
  rating: 0.1,
  registry: 0.05,
} as const;

export type MatchAxisId = keyof typeof DEFAULT_MATCH_WEIGHTS;

export const EMPTY_SEARCH_CRITERIA: FamilySearchCriteria = {
  sector: "",
  radiusKm: Number.POSITIVE_INFINITY,
  budgetMax: null,
  size: "any",
  minGoogleRating: null,
  priorities: { ...DEFAULT_PRIORITIES },
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
  autonomyScore: null,
  search: { ...EMPTY_SEARCH_CRITERIA, priorities: { ...DEFAULT_PRIORITIES } },
};

export type MatchAxisResult = {
  id: MatchAxisId;
  label: string;
  score: number | null;
  weight: number;
  why?: string;
  consider?: string;
};

export type ResidenceMatch = {
  score: number;
  tone: "strong" | "good" | "fair" | "low";
  headline: string;
  summary: string;
  why: string[];
  consider: string[];
  axes: MatchAxisResult[];
};

function clampPriority(n: number) {
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export function normalizePriorities(raw?: Partial<MatchPriorities> | null): MatchPriorities {
  return {
    care: clampPriority(raw?.care ?? DEFAULT_PRIORITIES.care),
    geo: clampPriority(raw?.geo ?? DEFAULT_PRIORITIES.geo),
    budget: clampPriority(raw?.budget ?? DEFAULT_PRIORITIES.budget),
    size: clampPriority(raw?.size ?? DEFAULT_PRIORITIES.size),
    rating: clampPriority(raw?.rating ?? DEFAULT_PRIORITIES.rating),
  };
}

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

export function parseAutonomyScore(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.round(raw);
    return n >= 1 && n <= 10 ? n : null;
  }
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const m = text.match(/^(\d{1,2})\s*\/\s*10/) || text.match(/^(\d{1,2})$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 10 ? n : null;
}

export function autonomyLabel(score: number | null): string {
  if (score == null) return "To be determined";
  if (score <= 3) return `${score}/10 · limited autonomy`;
  if (score <= 6) return `${score}/10 · semi-autonomous`;
  if (score <= 8) return `${score}/10 · fairly autonomous`;
  return `${score}/10 · highly autonomous`;
}

/**
 * Map RPA category codes to an autonomy band on the same 1–10 scale as the patient.
 * Cat 1 = autonomous · Cat 4 = high care.
 */
export function residenceAutonomyBand(residence: Residence): { lo: number; hi: number; labels: string[] } {
  const raw = (residence.categoryLabel || "").toLowerCase();
  const cats: number[] = [];
  for (const n of [1, 2, 3, 4]) {
    if (
      raw.includes(`catégorie ${n}`) ||
      raw.includes(`categorie ${n}`) ||
      raw.includes(`category ${n}`)
    ) {
      cats.push(n);
    }
  }
  // Fallback: parse facts
  if (cats.length === 0) {
    const fact = residence.facts?.find((f) => /catégor/i.test(f.label));
    if (fact) {
      for (const n of [1, 2, 3, 4]) {
        if (fact.value.includes(String(n))) cats.push(n);
      }
    }
  }
  if (cats.length === 0) return { lo: 3, hi: 8, labels: ["non précisée"] };

  const bands: Record<number, [number, number]> = {
    1: [7, 10],
    2: [5, 8],
    3: [3, 6],
    4: [1, 4],
  };
  let lo = 10;
  let hi = 1;
  for (const c of cats) {
    const b = bands[c]!;
    lo = Math.min(lo, b[0]);
    hi = Math.max(hi, b[1]);
  }
  return { lo, hi, labels: cats.map((c) => `category ${c}`) };
}

function residenceCapacity(residence: Residence): number {
  if (residence.units > 0) return residence.units;
  const fact = residence.facts?.find((f) => f.label === "Capacité");
  if (fact) {
    const n = Number(String(fact.value).replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function sizeBucket(capacity: number): Exclude<ResidenceSizePreference, "any"> | "unknown" {
  if (capacity <= 0) return "unknown";
  if (capacity < 40) return "small";
  if (capacity < 100) return "medium";
  return "large";
}

function hasCare(residence: Residence, needle: string) {
  return residence.care.some(
    (c) => c.offered && c.label.toLowerCase().includes(needle.toLowerCase()),
  );
}

function sectorHit(sector: string, residence: Residence): boolean | null {
  const s = sector.trim().toLowerCase();
  if (!s) return null;
  const hay = `${residence.city} ${residence.location.address}`.toLowerCase();
  return hay.includes(s);
}

/**
 * Resolve effective weights: base × user priority, drop unavailable axes, renormalize.
 */
export function resolveWeights(
  priorities: MatchPriorities,
  available: Partial<Record<MatchAxisId, boolean>>,
): Record<MatchAxisId, number> {
  const p = normalizePriorities(priorities);
  const priorityOf: Record<MatchAxisId, number> = {
    care: p.care,
    geo: p.geo,
    budget: p.budget,
    size: p.size,
    rating: p.rating,
    registry: 3,
  };

  const raw: Record<MatchAxisId, number> = {
    care: 0,
    geo: 0,
    budget: 0,
    size: 0,
    rating: 0,
    registry: 0,
  };

  let sum = 0;
  (Object.keys(DEFAULT_MATCH_WEIGHTS) as MatchAxisId[]).forEach((id) => {
    if (available[id] === false) {
      raw[id] = 0;
      return;
    }
    const w = DEFAULT_MATCH_WEIGHTS[id] * (priorityOf[id] / 3);
    raw[id] = w;
    sum += w;
  });

  if (sum <= 0) {
    return { ...DEFAULT_MATCH_WEIGHTS };
  }

  (Object.keys(raw) as MatchAxisId[]).forEach((id) => {
    raw[id] = raw[id] / sum;
  });
  return raw;
}

function scoreCareAxis(
  profil: FamilyCareProfile,
  residence: Residence,
  t: TranslateFn = identityT,
): { score: number; why: string[]; consider: string[] } {
  const why: string[] = [];
  const consider: string[] = [];
  let score = 55;
  const band = residenceAutonomyBand(residence);
  const patient = profil.autonomyScore;

  if (patient != null) {
    if (patient >= band.lo && patient <= band.hi) {
      score = 92;
      why.push(
        t("Autonomy {score}/10 compatible with {labels} ({lo}–{hi}/10)", { score: patient, labels: band.labels.join(" / "), lo: band.lo, hi: band.hi }),
      );
    } else {
      const dist = patient < band.lo ? band.lo - patient : patient - band.hi;
      // Each point of gap costs ~18 → gap of 4+ ≈ near-floor
      score = Math.max(8, 85 - dist * 18);
      consider.push(
        t("Autonomy {score}/10 vs residence closer to {lo}–{hi}/10 ({labels})", { score: patient, lo: band.lo, hi: band.hi, labels: band.labels.join(", ") }),
      );
      if (dist >= 3) {
        consider.unshift(
          patient < band.lo
            ? t("The person is significantly less autonomous than this residence's typical profile")
            : t("The person is more autonomous than the typical care level here"),
        );
      }
    }
  } else if (profil.autonomyHint) {
    const hint = profil.autonomyHint.toLowerCase();
    if (hint.includes("soin") && band.labels.some((l) => l.includes("4"))) {
      score += 15;
      why.push(t("Care level aligned (category 4)"));
    } else if (hint.includes("semi") && band.labels.some((l) => l.includes("2") || l.includes("3"))) {
      score += 10;
      why.push(t("Semi-autonomy compatible with the RPA category"));
    } else if (
      (hint.includes("autonome") ||
        hint.includes("indépend") ||
        hint.includes("autonomous") ||
        hint.includes("independ")) &&
      band.labels.some((l) => l.includes("category 1") || l.includes("catégorie 1"))
    ) {
      score += 12;
      why.push(t("Autonomous profile compatible"));
    }
  }

  if (profil.needsNursing) {
    if (hasCare(residence, "infirmiers") || residence.hasNursingStaff) {
      score = Math.min(100, score + 8);
      why.push(t("Nursing care declared"));
    } else {
      score = Math.max(5, score - 22);
      consider.unshift(t("Nursing care not confirmed while the file needs it"));
    }
  }

  if (profil.needsBathHelp) {
    if (hasCare(residence, "bain")) {
      score = Math.min(100, score + 5);
      why.push(t("Bathing assistance declared"));
    } else {
      score = Math.max(5, score - 12);
      consider.push(t("Bathing assistance not declared in the registry"));
    }
  }

  if (profil.needsMobilityHelp) {
    if (hasCare(residence, "mobilité")) {
      score = Math.min(100, score + 5);
      why.push(t("Mobility assistance declared"));
    } else {
      score = Math.max(5, score - 14);
      consider.push(t("Mobility assistance not declared (need present in the file)"));
    }
  }

  return { score: Math.round(Math.max(0, Math.min(100, score))), why, consider };
}

function scoreGeoAxis(
  profil: FamilyCareProfile,
  residence: Residence,
  t: TranslateFn = identityT,
): { score: number | null; why?: string; consider?: string } {
  const sector = (profil.search.sector || profil.sector || "").trim();
  if (!sector) return { score: null };

  const hit = sectorHit(sector, residence);
  if (hit === true) {
    return { score: 95, why: t('In the "{sector}" area', { sector }) };
  }

  // Soft match on region token
  const region = residence.city.includes(",")
    ? residence.city.slice(residence.city.indexOf(",") + 1).trim().toLowerCase()
    : "";
  if (region && sector.toLowerCase().includes(region.split(" ")[0] || "")) {
    return { score: 62, why: t("Same administrative region ({region})", { region }) };
  }

  return {
    score: 28,
    consider: t('Outside the desired area ("{sector}")', { sector }),
  };
}

function scoreBudgetAxis(
  profil: FamilyCareProfile,
  residence: Residence,
  t: TranslateFn = identityT,
): { score: number | null; why?: string; consider?: string } {
  const max =
    profil.search.budgetMax && profil.search.budgetMax > 0
      ? profil.search.budgetMax
      : Number.isFinite(profil.budgetMax)
        ? profil.budgetMax
        : null;
  if (max == null || !Number.isFinite(max)) return { score: null };

  const priced = estimateMonthlyPrice(residence);
  if (!priced) return { score: null };
  const { amount, estimated } = priced;
  const suffix = estimated ? t(" (estimate)") : "";

  if (amount > max) {
    const over = (amount - max) / max;
    return {
      score: Math.max(8, Math.round(52 - Math.min(40, over * 55))),
      consider: t("Indicative rate {amount} $ > budget {max} ${suffix}", { amount: amount.toLocaleString("fr-CA"), max: max.toLocaleString("fr-CA"), suffix }),
    };
  }
  if (amount <= max * 0.9) {
    return {
      score: 92,
      why: t("Within budget (~{amount} $){suffix}", { amount: amount.toLocaleString("fr-CA"), suffix }),
    };
  }
  return {
    score: 74,
    why: t("Close to max budget (~{amount} $){suffix}", { amount: amount.toLocaleString("fr-CA"), suffix }),
  };
}

/**
 * Indicative monthly rent for matching when the registry has no published tariff.
 */
export function estimateMonthlyPrice(residence: Residence): {
  amount: number;
  estimated: boolean;
} | null {
  if (residence.priceAmount > 0) {
    return { amount: residence.priceAmount, estimated: false };
  }
  const band = residenceAutonomyBand(residence);
  const mid = (band.lo + band.hi) / 2;
  let base = 4800 - mid * 260;
  const hay = `${residence.city} ${residence.location.address}`.toLowerCase();
  if (/montréal|montreal|laval|longueuil/.test(hay)) base *= 1.12;
  else if (/québec|quebec|lévis|levis|gatineau/.test(hay)) base *= 1.05;
  if (residence.hasNursingStaff) base += 280;
  if (residence.units > 0 && residence.units < 40) base += 120;
  if (residence.units >= 150) base -= 80;
  const amount = Math.max(1800, Math.min(5500, Math.round(base / 50) * 50));
  return { amount, estimated: true };
}

function scoreSizeAxis(
  profil: FamilyCareProfile,
  residence: Residence,
  t: TranslateFn = identityT,
): { score: number | null; why?: string; consider?: string } {
  const pref = profil.search.size || "any";
  if (pref === "any") return { score: null };
  const cap = residenceCapacity(residence);
  const bucket = sizeBucket(cap);
  if (bucket === "unknown") return { score: null };
  if (bucket === pref) {
    const labels = { small: t("small"), medium: t("medium"), large: t("large") } as const;
    return { score: 92, why: t("Size {label} ({cap} units)", { label: labels[pref], cap }) };
  }
  const order = { small: 0, medium: 1, large: 2 } as const;
  const dist = Math.abs(order[bucket] - order[pref]);
  return {
    score: dist === 1 ? 48 : 22,
    consider: t("Size {bucket} ({cap}) vs preference {pref}", { bucket, cap, pref }),
  };
}

function scoreRatingAxis(
  profil: FamilyCareProfile,
  residence: Residence,
  t: TranslateFn = identityT,
): { score: number | null; why?: string; consider?: string } {
  const rating = residence.googleRating;
  if (rating == null || !Number.isFinite(rating)) {
    return { score: null };
  }
  const min = profil.search.minGoogleRating;
  if (min != null && rating < min) {
    return { score: Math.max(15, (rating / 5) * 55), consider: t("Google rating {rating} below minimum {min}", { rating: rating.toFixed(1), min }) };
  }
  return { score: Math.round((rating / 5) * 100), why: t("Google rating {rating}/5", { rating: rating.toFixed(1) }) };
}

function scoreRegistryAxis(residence: Residence, t: TranslateFn = identityT): { score: number; why?: string } {
  // Normalize compatibilityBase (~50–88) toward 0–100
  const base = residence.compatibilityBase;
  const score = Math.round(Math.max(0, Math.min(100, ((base - 40) / 50) * 100)));
  return {
    score,
    why: residence.confirmed ? t("Certified in the RPA registry") : undefined,
  };
}

/**
 * Derive a care-matching profile from the family dossier / search criteria.
 * Partial dossiers still apply whatever fields are filled (including draft).
 */
export function careProfileFromFamilyInputs(input?: {
  ville?: string | null;
  budget?: string | null;
  budgetMax?: string | number | null;
  autonomie?: string | null;
  autonomyScore?: number | null;
  aideHygiene?: string | null;
  aideMedication?: string | null;
  mobilite?: string | null;
  services?: string | null;
  searchZones?: { query?: string | null }[] | null;
  searchCriteria?: Partial<FamilySearchCriteria> | null;
  draft?: boolean;
} | null): FamilyCareProfile {
  if (!input) {
    return {
      ...EMPTY_CARE_PROFILE,
      search: { ...EMPTY_SEARCH_CRITERIA, priorities: { ...DEFAULT_PRIORITIES } },
    };
  }

  const sc = input.searchCriteria;
  const zone =
    sc?.sector?.trim() ||
    input.searchZones?.map((z) => z.query?.trim()).find(Boolean) ||
    input.ville?.trim() ||
    "";
  const services = (input.services || "").toLowerCase();
  const autonomie = (input.autonomie || "").trim();
  const autonomyScore =
    input.autonomyScore != null && input.autonomyScore >= 1 && input.autonomyScore <= 10
      ? Math.round(input.autonomyScore)
      : parseAutonomyScore(autonomie);

  const needsNursing =
    affirmativeNeed(input.aideMedication) ||
    /infirm|médic|medic|soin/.test(services) ||
    (autonomyScore != null && autonomyScore <= 4) ||
    /soin|dépendance|dependance/.test(autonomie.toLowerCase());

  const budgetFromSearch =
    sc?.budgetMax != null && Number.isFinite(sc.budgetMax) && sc.budgetMax > 0
      ? sc.budgetMax
      : null;
  const budgetMax = budgetFromSearch
    ? budgetFromSearch
    : (() => {
        const fromMax = parseBudgetMax(input.budgetMax);
        if (Number.isFinite(fromMax)) return fromMax;
        return parseBudgetMax(input.budget);
      })();

  return {
    budgetMax,
    sector: zone,
    needsNursing,
    needsBathHelp:
      affirmativeNeed(input.aideHygiene) ||
      /bain|hygiène|hygiene/.test(services) ||
      (autonomyScore != null && autonomyScore <= 5),
    needsMobilityHelp:
      affirmativeNeed(input.mobilite) ||
      /mobilité|mobilite/.test(services) ||
      (autonomyScore != null && autonomyScore <= 4),
    unitPreference: "",
    maxDistanceKm:
      sc?.radiusKm && Number.isFinite(sc.radiusKm) && sc.radiusKm > 0
        ? sc.radiusKm
        : Number.POSITIVE_INFINITY,
    autonomyHint: autonomie === "À préciser" ? autonomyLabel(autonomyScore) : autonomie,
    autonomyScore,
    search: {
      sector: zone,
      radiusKm:
        sc?.radiusKm && Number.isFinite(sc.radiusKm) && sc.radiusKm > 0
          ? sc.radiusKm
          : Number.POSITIVE_INFINITY,
      budgetMax: Number.isFinite(budgetMax) ? budgetMax : null,
      size: sc?.size || "any",
      minGoogleRating: sc?.minGoogleRating ?? null,
      priorities: normalizePriorities(sc?.priorities),
    },
  };
}

export type MatchReadiness = {
  ready: boolean;
  missing: string[];
};

/**
 * Personalized scores require autonomy + search sector + budget.
 * Size may stay « any »; Google rating is optional until data exists.
 */
export function getMatchReadiness(profil: FamilyCareProfile): MatchReadiness {
  const missing: string[] = [];
  if (profil.autonomyScore == null || profil.autonomyScore < 1 || profil.autonomyScore > 10) {
    missing.push("Autonomy score (1 to 10)");
  }
  if (!(profil.search.sector || profil.sector).trim()) {
    missing.push("Desired area / city");
  }
  const budget =
    profil.search.budgetMax && profil.search.budgetMax > 0
      ? profil.search.budgetMax
      : Number.isFinite(profil.budgetMax)
        ? profil.budgetMax
        : null;
  if (budget == null || !Number.isFinite(budget) || budget <= 0) {
    missing.push("Max monthly budget");
  }
  return { ready: missing.length === 0, missing };
}

/**
 * Weighted, axis-based match between dossier + search criteria and an RPA card.
 */
export function computeMatch(
  profil: FamilyCareProfile = EMPTY_CARE_PROFILE,
  residence: Residence,
  t: TranslateFn = identityT,
): ResidenceMatch {
  const care = scoreCareAxis(profil, residence, t);
  const geo = scoreGeoAxis(profil, residence, t);
  const budget = scoreBudgetAxis(profil, residence, t);
  const size = scoreSizeAxis(profil, residence, t);
  const rating = scoreRatingAxis(profil, residence, t);
  const registry = scoreRegistryAxis(residence, t);

  const available: Partial<Record<MatchAxisId, boolean>> = {
    care: true,
    geo: geo.score != null,
    budget: budget.score != null,
    size: size.score != null,
    rating: rating.score != null,
    registry: true,
  };

  const weights = resolveWeights(profil.search.priorities, available);

  const axisDefs: {
    id: MatchAxisId;
    label: string;
    score: number | null;
    why?: string;
    consider?: string;
  }[] = [
    {
      id: "care",
      label: t("Care & autonomy"),
      score: care.score,
      why: care.why[0],
      consider: care.consider[0],
    },
    { id: "geo", label: t("Geographic area"), score: geo.score, why: geo.why, consider: geo.consider },
    {
      id: "budget",
      label: t("Budget"),
      score: budget.score,
      why: budget.why,
      consider: budget.consider,
    },
    { id: "size", label: t("Size"), score: size.score, why: size.why, consider: size.consider },
    {
      id: "rating",
      label: t("Google rating"),
      score: rating.score,
      why: rating.why,
      consider: rating.consider,
    },
    {
      id: "registry",
      label: t("RPA registry"),
      score: registry.score,
      why: registry.why,
    },
  ];

  let weighted = 0;
  let used = 0;
  const axes: MatchAxisResult[] = axisDefs.map((a) => {
    const w = weights[a.id] || 0;
    if (a.score != null && w > 0) {
      weighted += a.score * w;
      used += w;
    }
    return {
      id: a.id,
      label: a.label,
      score: a.score,
      weight: w,
      why: a.why,
      consider: a.consider,
    };
  });

  const score = Math.max(
    5,
    Math.min(98, Math.round(used > 0 ? weighted / used : residence.compatibilityBase)),
  );

  const why = [
    ...care.why,
    geo.why,
    budget.why,
    size.why,
    rating.why,
    registry.why,
    ...residence.why,
  ].filter(Boolean) as string[];

  const consider = [
    ...care.consider,
    geo.consider,
    budget.consider,
    size.consider,
    rating.consider,
    ...residence.consider,
  ].filter(Boolean) as string[];

  const tone: ResidenceMatch["tone"] =
    score >= 80 ? "strong" : score >= 65 ? "good" : score >= 50 ? "fair" : "low";

  const headline =
    tone === "strong"
      ? t("Very strong match")
      : tone === "good"
        ? t("Good match")
        : tone === "fair"
          ? t("Partial match")
          : t("Limited match");

  const topWhy = why.slice(0, 3).join(", ");
  const topConsider = consider.slice(0, 2).join("; ");

  const summary =
    tone === "strong" || tone === "good"
      ? t("{name} looks like a strong fit for your file{whySuffix}{considerSuffix}", {
          name: residence.name,
          whySuffix: topWhy ? t(" : {details}", { details: topWhy }) : ".",
          considerSuffix: topConsider
            ? t(" To verify: {details}.", { details: topConsider })
            : "",
        })
      : t("{name} only covers part of your needs{considerSuffix}{whySuffix}", {
          name: residence.name,
          considerSuffix: topConsider ? t(" — {details}", { details: topConsider }) : "",
          whySuffix: topWhy ? t(" Favorable points: {details}.", { details: topWhy }) : "",
        });

  return {
    score,
    tone,
    headline,
    summary,
    why: Array.from(new Set(why)).slice(0, 5),
    consider: Array.from(new Set(consider)).slice(0, 4),
    axes,
  };
}
