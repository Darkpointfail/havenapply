import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CareLevel, Residence } from "@/data/residences";
import { residences as curatedResidences } from "@/data/residences";

export type CmsNursingHomeRaw = {
  id: string;
  ccn: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  county: string;
  ownership: string;
  providerType: string;
  legalName: string;
  chainName: string;
  beds: number | null;
  avgResidents: number | null;
  lat: number | null;
  lng: number | null;
  overallRating: number | null;
  healthRating: number | null;
  qmRating: number | null;
  staffingRating: number | null;
  ccrc: boolean;
  specialFocus: string;
  abuseIcon: boolean;
  sprinklers: string;
  fines: number;
  fineAmount: number;
  certifiedSince: string;
};

const NO_PHOTO = "";

let cachedRaw: CmsNursingHomeRaw[] | null = null;
let cachedMapped: Residence[] | null = null;
let cachedById: Map<string, Residence> | null = null;

function loadRaw(): CmsNursingHomeRaw[] {
  if (cachedRaw) return cachedRaw;
  const path = join(process.cwd(), "data/cms/nursing-homes.json");
  cachedRaw = JSON.parse(readFileSync(path, "utf8")) as CmsNursingHomeRaw[];
  return cachedRaw;
}

function careLevelsFor(row: CmsNursingHomeRaw): CareLevel[] {
  const levels: CareLevel[] = ["Nursing care"];
  if (row.ccrc) levels.push("CCRC");
  // Many SNFs also offer short-stay rehab.
  levels.push("Rehabilitation");
  return levels;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw || "N/A";
}

export function mapCmsToResidence(row: CmsNursingHomeRaw): Residence {
  const acceptsMedicaid = /medicaid/i.test(row.providerType);
  const rating = row.overallRating != null && row.overallRating > 0 ? row.overallRating : 0;
  const lat = row.lat ?? 39.8283;
  const lng = row.lng ?? -98.5795;
  const beds = row.beds != null ? Math.round(row.beds) : null;

  const highlights = [
    row.providerType || "Medicare-certified",
    beds != null ? `${beds} certified beds` : null,
    row.ownership || null,
    row.chainName ? `Chain: ${row.chainName}` : null,
    row.specialFocus ? `Special focus: ${row.specialFocus}` : null,
  ].filter(Boolean) as string[];

  const aboutParts = [
    `${row.name} is a Medicare Care Compare nursing home`,
    row.city && row.state ? `in ${row.city}, ${row.state}` : null,
    beds != null ? `with ${beds} certified beds` : null,
    row.ownership ? `(${row.ownership})` : null,
  ].filter(Boolean);

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    zip: row.zip,
    region: row.county || row.state,
    distanceKm: 0,
    distanceMiles: 0,
    lat,
    lng,
    priceFrom: null,
    priceAvailable: false,
    waitingWeeks: null,
    availableNow: false,
    availabilityConfirmed: false,
    careLevels: careLevelsFor(row),
    rating,
    reviewCount: 0,
    roomTypes: ["Private", "Shared"],
    petFriendly: false,
    languages: ["English"],
    mealsIncluded: false,
    specialMeals: false,
    wheelchairAccessible: true,
    medicalServices: ["Skilled nursing", "Medicare-certified care"],
    acceptsMedicaid,
    acceptsVeteransBenefits: false,
    secureMemoryCare: false,
    transportAvailable: false,
    couplesWelcome: false,
    respiteAvailable: false,
    partner: false,
    highlights,
    image: NO_PHOTO,
    gallery: [],
    about: `${aboutParts.join(" ")}. Pricing is not published (N/A). Data from CMS Provider Data Catalog.`,
    staffRatio:
      row.staffingRating != null
        ? `CMS staffing rating: ${row.staffingRating}/5`
        : "CMS staffing rating: N/A",
    doctors: [],
    nurses: [],
    therapists: [],
    amenities: [
      row.sprinklers === "Yes" ? "Automatic sprinkler systems" : "",
      row.ccrc ? "Continuing care retirement community" : "",
    ].filter(Boolean),
    activities: [],
    meals: [],
    includedServices: ["Medicare / Medicaid certified skilled nursing"],
    pricing: [],
    inspections: [
      {
        date: "CMS Care Compare",
        result:
          row.healthRating != null
            ? `Health inspection ${row.healthRating}/5`
            : "Health inspection N/A",
        summary: [
          row.qmRating != null ? `Quality measures ${row.qmRating}/5` : null,
          row.staffingRating != null ? `Staffing ${row.staffingRating}/5` : null,
          row.fines ? `${row.fines} fine(s), $${row.fineAmount}` : "No recent fines listed",
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ],
    reviews: [],
  };
}

export function getCmsResidences(): Residence[] {
  if (cachedMapped) return cachedMapped;
  cachedMapped = loadRaw().map(mapCmsToResidence);
  return cachedMapped;
}

function byIdMap(): Map<string, Residence> {
  if (cachedById) return cachedById;
  cachedById = new Map();
  for (const r of curatedResidences) cachedById.set(r.id, r);
  for (const r of getCmsResidences()) cachedById.set(r.id, r);
  return cachedById;
}

export function getCatalogResidence(id: string): Residence | undefined {
  return byIdMap().get(id);
}

export function getFullCatalog(): Residence[] {
  return [...curatedResidences, ...getCmsResidences()];
}

export function getCmsRawById(id: string): CmsNursingHomeRaw | undefined {
  return loadRaw().find((r) => r.id === id);
}

export type CommunitySearchInput = {
  query?: string;
  state?: string;
  careType?: string;
  medicaid?: boolean;
  minRating?: number;
  postalCode?: string;
  maxMiles?: number;
  page?: number;
  limit?: number;
  source?: "all" | "curated" | "medicare";
};

export type CommunitySearchResult = {
  items: Residence[];
  total: number;
  page: number;
  limit: number;
  medicareCount: number;
  curatedCount: number;
};

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function searchCommunities(input: CommunitySearchInput): CommunitySearchResult {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(100, Math.max(1, input.limit || 48));
  const q = (input.query || "").trim().toLowerCase();
  const state = (input.state || "").trim().toUpperCase();
  const careType = (input.careType || "").trim().toLowerCase();

  let list: Residence[] = [];
  if (input.source === "curated") list = [...curatedResidences];
  else if (input.source === "medicare") list = getCmsResidences();
  else list = getFullCatalog();

  let origin: { lat: number; lng: number } | null = null;
  const postal = (input.postalCode || "").replace(/\D/g, "");
  if (postal.length >= 3) {
    const match = list.find((r) => r.zip.replace(/\D/g, "").startsWith(postal.slice(0, 3)));
    if (match) origin = { lat: match.lat, lng: match.lng };
  }

  const filtered = list.filter((r) => {
    if (q) {
      const hay = `${r.name} ${r.city} ${r.state} ${r.zip} ${r.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (state && r.state.toUpperCase() !== state) return false;
    if (careType) {
      const ok = r.careLevels.some((c) => c.toLowerCase().includes(careType));
      if (!ok) return false;
    }
    if (input.medicaid && !r.acceptsMedicaid) return false;
    if (input.minRating != null && r.rating < input.minRating) return false;
    if (origin && input.maxMiles != null) {
      const miles = haversineMiles(origin, r);
      if (miles > input.maxMiles) return false;
    }
    return true;
  });

  const sorted = origin
    ? [...filtered]
        .map((r) => ({
          r: {
            ...r,
            distanceMiles: Math.round(haversineMiles(origin!, r) * 10) / 10,
            distanceKm: Math.round(haversineMiles(origin!, r) * 1.60934 * 10) / 10,
          },
        }))
        .sort((a, b) => a.r.distanceMiles - b.r.distanceMiles)
        .map((x) => x.r)
    : filtered;

  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit);

  return {
    items,
    total: sorted.length,
    page,
    limit,
    medicareCount: getCmsResidences().length,
    curatedCount: curatedResidences.length,
  };
}
