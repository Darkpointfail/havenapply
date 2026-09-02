import type { Residence } from "@/data/residences";
import type { CareNeeds } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";

export type MatchReason = {
  tone: "fit" | "partial" | "gap";
  text: string;
};

export type CompatibilityResult = {
  score: number;
  reasons: MatchReason[];
  disclaimer: string;
};

export type SearchFilters = {
  query: string;
  /** Postal / ZIP code used as the search origin for distance. */
  postalCode: string;
  careTypes: string[];
  budgetMax: number | null;
  budgetMin: number | null;
  maxMiles: number | null;
  availability: "any" | "now" | "waitlist";
  room: "any" | "private" | "shared";
  secureMemoryCare: boolean;
  medicaid: boolean;
  veterans: boolean;
  medicalServices: boolean;
  pets: boolean;
  languages: string[];
  minRating: number | null;
  amenities: boolean;
  specialMeals: boolean;
  transport: boolean;
  couples: boolean;
  respite: boolean;
  immediateOnly: boolean;
  partnersOnly: boolean;
};

export const emptySearchFilters = (): SearchFilters => ({
  query: "",
  postalCode: "",
  careTypes: [],
  budgetMax: null,
  budgetMin: null,
  maxMiles: null,
  availability: "any",
  room: "any",
  secureMemoryCare: false,
  medicaid: false,
  veterans: false,
  medicalServices: false,
  pets: false,
  languages: [],
  minRating: null,
  amenities: false,
  specialMeals: false,
  transport: false,
  couples: false,
  respite: false,
  immediateOnly: false,
  partnersOnly: false,
});

function normalizePostal(raw: string) {
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6);
}

/** Rough distance in miles between two lat/lng points. */
export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Demo centroids for common metros when the ZIP is not in the catalog. */
const POSTAL_FALLBACKS: { prefix: string; lat: number; lng: number; label: string }[] = [
  { prefix: "787", lat: 30.27, lng: -97.74, label: "Austin, TX" },
  { prefix: "786", lat: 30.51, lng: -97.68, label: "Round Rock / North Austin, TX" },
  { prefix: "752", lat: 32.78, lng: -96.8, label: "Dallas, TX" },
  { prefix: "750", lat: 32.96, lng: -96.73, label: "North Dallas, TX" },
  { prefix: "770", lat: 29.76, lng: -95.37, label: "Houston, TX" },
  { prefix: "774", lat: 29.69, lng: -95.63, label: "West Houston, TX" },
  { prefix: "782", lat: 29.42, lng: -98.49, label: "San Antonio, TX" },
  { prefix: "761", lat: 32.75, lng: -97.33, label: "Fort Worth, TX" },
  { prefix: "100", lat: 40.75, lng: -73.98, label: "New York, NY" },
  { prefix: "021", lat: 42.36, lng: -71.06, label: "Boston, MA" },
  { prefix: "90", lat: 34.05, lng: -118.24, label: "Los Angeles, CA" },
  { prefix: "941", lat: 37.77, lng: -122.42, label: "San Francisco, CA" },
  { prefix: "606", lat: 41.88, lng: -87.63, label: "Chicago, IL" },
  { prefix: "H2", lat: 45.5, lng: -73.57, label: "Montreal, QC" },
  { prefix: "M5", lat: 43.65, lng: -79.38, label: "Toronto, ON" },
];

export function originFromPostalCode(
  postalCode: string,
  catalog: Residence[],
): { lat: number; lng: number; label: string } | null {
  const clean = normalizePostal(postalCode);
  if (clean.length < 3) return null;

  const exact = catalog.find((r) => normalizePostal(r.zip) === clean.slice(0, 5));
  if (exact) {
    return { lat: exact.lat, lng: exact.lng, label: `${exact.city}, ${exact.state} ${exact.zip}` };
  }

  const prefix3 = clean.slice(0, 3);
  const nearby = catalog.filter((r) => normalizePostal(r.zip).startsWith(prefix3));
  if (nearby.length) {
    return {
      lat: nearby.reduce((s, r) => s + r.lat, 0) / nearby.length,
      lng: nearby.reduce((s, r) => s + r.lng, 0) / nearby.length,
      label: `${nearby[0].city} area (${prefix3}…)`,
    };
  }

  const fallback = POSTAL_FALLBACKS.find(
    (f) => clean.startsWith(f.prefix) || f.prefix.startsWith(clean.slice(0, f.prefix.length)),
  );
  if (fallback) {
    return { lat: fallback.lat, lng: fallback.lng, label: fallback.label };
  }

  return null;
}

export function distanceMilesForFilters(
  residence: Residence,
  filters: SearchFilters,
  catalog: Residence[] = [],
) {
  const origin = filters.postalCode.trim()
    ? originFromPostalCode(filters.postalCode, catalog.length ? catalog : [residence])
    : null;
  if (origin) return Math.round(milesBetween(origin, residence) * 10) / 10;
  return residence.distanceMiles;
}

export function filterResidences(list: Residence[], filters: SearchFilters): Residence[] {
  const q = filters.query.trim().toLowerCase();
  const origin = filters.postalCode.trim()
    ? originFromPostalCode(filters.postalCode, list)
    : null;

  const filtered = list.filter((r) => {
    if (q) {
      const hay = `${r.name} ${r.city} ${r.state} ${r.zip} ${r.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.postalCode.trim()) {
      const clean = normalizePostal(filters.postalCode);
      const zip = normalizePostal(r.zip);
      // Soft postal preference: keep all when we have an origin; exact/prefix boost happens in sort.
      // If origin unknown, fall back to ZIP substring match.
      if (!origin && clean.length >= 3 && !zip.startsWith(clean.slice(0, 3)) && !zip.includes(clean)) {
        return false;
      }
    }
    if (filters.careTypes.length) {
      const ok = filters.careTypes.some((c) =>
        r.careLevels.some((level) => level.toLowerCase().includes(c.toLowerCase())),
      );
      if (!ok) return false;
    }
    if (filters.budgetMax != null && r.priceAvailable && r.priceFrom != null) {
      if (r.priceFrom > filters.budgetMax) return false;
    }
    if (filters.budgetMin != null && r.priceAvailable && r.priceFrom != null) {
      if (r.priceFrom < filters.budgetMin) return false;
    }
    if (filters.maxMiles != null) {
      const miles = origin ? milesBetween(origin, r) : r.distanceMiles;
      if (miles > filters.maxMiles) return false;
    }
    if (filters.availability === "now" && !r.availableNow) return false;
    if (filters.availability === "waitlist" && r.availableNow) return false;
    if (filters.immediateOnly && !r.availableNow) return false;
    if (filters.room === "private" && !r.roomTypes.includes("Private")) return false;
    if (filters.room === "shared" && !r.roomTypes.includes("Shared")) return false;
    if (filters.secureMemoryCare && !r.secureMemoryCare) return false;
    if (filters.medicaid && !r.acceptsMedicaid) return false;
    if (filters.veterans && !r.acceptsVeteransBenefits) return false;
    if (filters.medicalServices && r.medicalServices.length === 0) return false;
    if (filters.pets && !r.petFriendly) return false;
    if (filters.languages.length) {
      const ok = filters.languages.some((l) =>
        r.languages.some((rl) => rl.toLowerCase() === l.toLowerCase()),
      );
      if (!ok) return false;
    }
    if (filters.minRating != null && r.rating < filters.minRating) return false;
    if (filters.amenities && r.amenities.length < 3) return false;
    if (filters.specialMeals && !r.specialMeals) return false;
    if (filters.transport && !r.transportAvailable) return false;
    if (filters.couples && !r.couplesWelcome) return false;
    if (filters.respite && !r.respiteAvailable) return false;
    if (filters.partnersOnly && !r.partner) return false;
    return true;
  });

  if (!origin && !filters.postalCode.trim()) return filtered;

  const clean = normalizePostal(filters.postalCode);
  return [...filtered].sort((a, b) => {
    const az = normalizePostal(a.zip);
    const bz = normalizePostal(b.zip);
    const aExact = clean && az.startsWith(clean.slice(0, Math.min(5, clean.length))) ? 0 : 1;
    const bExact = clean && bz.startsWith(clean.slice(0, Math.min(5, clean.length))) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    if (origin) {
      return milesBetween(origin, a) - milesBetween(origin, b);
    }
    return a.distanceMiles - b.distanceMiles;
  });
}

export function computeCompatibility(
  residence: Residence,
  senior?: SeniorProfile | null,
  care?: CareNeeds | null,
): CompatibilityResult {
  const reasons: MatchReason[] = [];
  let score = 55;

  // Care type
  const housing = senior?.housingTypes || [];
  const careMap: Record<string, string[]> = {
    independent: ["Independent living"],
    assisted: ["Assisted living"],
    memory: ["Memory care"],
    nursing: ["Nursing care"],
    respite: ["Respite care"],
    ccrc: ["CCRC", "Independent living", "Assisted living"],
  };
  if (housing.length && !housing.includes("unsure")) {
    const wanted = housing.flatMap((h) => careMap[h] || []);
    const hit = wanted.some((w) => residence.careLevels.includes(w as Residence["careLevels"][number]));
    if (hit) {
      score += 14;
      reasons.push({ tone: "fit", text: "Care levels align with the housing types you selected." });
    } else {
      score -= 8;
      reasons.push({
        tone: "gap",
        text: "Listed care types differ from the housing options in your senior profile.",
      });
    }
  } else {
    reasons.push({
      tone: "partial",
      text: "No housing preference set yet, score uses general community fit.",
    });
  }

  // Budget
  if (senior && !senior.budgetUnsure && senior.budgetMax && residence.priceAvailable && residence.priceFrom != null) {
    const max = Number(senior.budgetMax);
    if (residence.priceFrom <= max) {
      score += 12;
      reasons.push({
        tone: "fit",
        text: `Starting price is within your monthly maximum ($${max.toLocaleString()}).`,
      });
    } else if (residence.priceFrom <= max * 1.15) {
      score += 4;
      reasons.push({
        tone: "partial",
        text: "Starting price is slightly above your stated maximum.",
      });
    } else {
      score -= 10;
      reasons.push({
        tone: "gap",
        text: "Starting price appears above your stated budget range.",
      });
    }
  } else if (!residence.priceAvailable || residence.priceFrom == null) {
    reasons.push({
      tone: "partial",
      text: "Public pricing is unavailable, confirm rates directly with the community.",
    });
  }

  // Location / distance
  if (senior?.searchZones?.some((z) => z.query.trim())) {
    const zone = senior.searchZones.find((z) => z.query.trim())!;
    const q = zone.query.toLowerCase();
    const locHit =
      residence.city.toLowerCase().includes(q) ||
      residence.zip.includes(q) ||
      residence.state.toLowerCase().includes(q) ||
      residence.region.toLowerCase().includes(q);
    if (locHit) {
      score += 10;
      reasons.push({ tone: "fit", text: "Location matches an area in your search zones." });
    } else if (zone.radiusMiles === 0 || residence.distanceMiles <= (zone.radiusMiles || 25)) {
      score += 6;
      reasons.push({
        tone: "partial",
        text: `About ${residence.distanceMiles} miles away, within a typical search radius.`,
      });
    } else {
      score -= 4;
      reasons.push({
        tone: "gap",
        text: `Further out (~${residence.distanceMiles} mi) than your usual radius.`,
      });
    }
  } else {
    reasons.push({
      tone: "partial",
      text: `About ${residence.distanceMiles} miles from the demo search center.`,
    });
    score += 3;
  }

  // Medical / cognition from care needs
  if (care) {
    const cog = new Set(care.cognition);
    const needsMemory =
      cog.has("dementia") ||
      cog.has("alzheimers") ||
      cog.has("wandering") ||
      cog.has("secure") ||
      cog.has("sundowning");
    if (needsMemory) {
      if (residence.secureMemoryCare || residence.careLevels.includes("Memory care")) {
        score += 12;
        reasons.push({
          tone: "fit",
          text: "Offers memory care / secure environment matching cognitive needs you described.",
        });
      } else {
        score -= 12;
        reasons.push({
          tone: "gap",
          text: "Cognitive needs suggest secure memory support this community may not emphasize.",
        });
      }
    }

    const health = new Set(care.health);
    if (health.has("dialysis") || health.has("oxygen") || health.has("wounds") || health.has("hospice")) {
      if (residence.careLevels.includes("Nursing care") || residence.medicalServices.length >= 3) {
        score += 8;
        reasons.push({
          tone: "fit",
          text: "Medical services look relevant to the clinical supports you flagged.",
        });
      } else {
        score -= 6;
        reasons.push({
          tone: "gap",
          text: "Higher medical needs may require more clinical capacity than listed here.",
        });
      }
    }

    if (care.preferences.pets?.trim() && residence.petFriendly) {
      score += 4;
      reasons.push({ tone: "fit", text: "Pet-friendly, aligns with your preferences." });
    }
    if (care.preferences.language?.trim()) {
      const lang = care.preferences.language.toLowerCase();
      const hit = residence.languages.some((l) => lang.includes(l.toLowerCase()) || l.toLowerCase().includes(lang.split(" ")[0]));
      if (hit) {
        score += 5;
        reasons.push({ tone: "fit", text: "Staff languages may match your language preference." });
      }
    }
  }

  // Availability
  if (residence.availableNow && residence.availabilityConfirmed) {
    score += 8;
    reasons.push({ tone: "fit", text: "Availability is confirmed for near-term move-in interest." });
  } else if (residence.availableNow && !residence.availabilityConfirmed) {
    score += 3;
    reasons.push({
      tone: "partial",
      text: "Listed as available, confirmation still pending with the community.",
    });
  } else if (residence.waitingWeeks) {
    reasons.push({
      tone: "partial",
      text: `Waitlist estimated around ${residence.waitingWeeks} weeks, not immediate.`,
    });
  }

  if (!residence.partner) {
    score -= 5;
    reasons.push({
      tone: "partial",
      text: "Non-partner listing, apply/messaging flows may be more limited on Haven.",
    });
  }

  score = Math.max(28, Math.min(98, Math.round(score)));

  if (reasons.length > 5) reasons.splice(5);

  return {
    score,
    reasons,
    disclaimer:
      "Compatibility is a search aid from your profile and care needs, not a guarantee of admission, clinical fit, or bed availability.",
  };
}
