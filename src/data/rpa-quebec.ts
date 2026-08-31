import type { Residence } from "@/data/family-space";
import catalog from "../../data/rpa/quebec-residences.json";

export type RpaResidenceRow = {
  id: string;
  ref: string;
  name: string;
  address: string;
  city: string;
  postal: string | null;
  phone: string | null;
  regionCode: string;
  region: string;
  mrc: string | null;
  category: string;
  type: string | null;
  certification: string | null;
  capacity: number | null;
  residents: number | null;
  units: number | null;
  unitsByCategory?: Record<string, number | null>;
  roomsSingle: number | null;
  roomsDouble: number | null;
  apartments: number | null;
  services: string[];
  safety?: string[];
  security: string | null;
  floors?: number | null;
  elevators?: number | null;
  openedOn?: string | null;
  ages?: {
    under65: number | null;
    from65to74: number | null;
    from75to84: number | null;
    from85: number | null;
  };
  staffing?: {
    nursesWeekday: { day: number; evening: number; night: number };
    aidesWeekdayDay: number;
    hasNursingPresence: boolean;
  };
  entente108: boolean;
  operator?: string | null;
  group?: string | null;
  verified?: string | null;
  sourceDate: string | null;
  lat?: number | null;
  lng?: number | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  "1": "category 1 (autonomy)",
  "2": "category 2 (light assistance)",
  "3": "category 3 (assistance)",
  "4": "category 4 (care)",
};

function categoryPhrase(raw: string): string {
  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((c) => CATEGORY_LABELS[c] ?? `category ${c}`);
  if (parts.length === 0) return "category not specified";
  if (parts.length === 1) return parts[0];
  return parts.join(" and ");
}

function autonomyFromCategory(raw: string): { value: string; offered: boolean } {
  const cats = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (cats.includes("4")) return { value: "Intermediate care assistance", offered: true };
  if (cats.includes("3")) return { value: "Assistance", offered: true };
  if (cats.includes("2")) return { value: "Semi-autonomous to light assistance", offered: true };
  if (cats.includes("1")) return { value: "Autonomous", offered: true };
  return { value: "To confirm", offered: false };
}

function hasService(services: string[], needle: string) {
  return services.some((s) => s.toLowerCase().includes(needle.toLowerCase()));
}

function unitSummary(row: RpaResidenceRow): {
  unitType: string;
  unitRows: Residence["unitRows"];
} {
  const rows: Residence["unitRows"] = [];
  if ((row.apartments ?? 0) > 0) {
    rows.push({
      type: "Logement",
      area: "—",
      price: "On request",
      availability: `${row.apartments} in registry`,
      availabilityTone: "green",
    });
  }
  if ((row.roomsSingle ?? 0) > 0) {
    rows.push({
      type: "Chambre simple",
      area: "—",
      price: "On request",
      availability: `${row.roomsSingle} in registry`,
      availabilityTone: "green",
    });
  }
  if ((row.roomsDouble ?? 0) > 0) {
    rows.push({
      type: "Chambre double",
      area: "—",
      price: "On request",
      availability: `${row.roomsDouble} in registry`,
      availabilityTone: "green",
    });
  }
  if (rows.length === 0) {
    rows.push({
      type: "Rental unit",
      area: "—",
      price: "On request",
      availability: "To confirm",
      availabilityTone: "terra",
    });
  }
  return { unitType: rows[0].type, unitRows: rows };
}

function buildFacts(row: RpaResidenceRow): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (row.capacity) facts.push({ label: "Capacity", value: `${row.capacity} people` });
  if (row.units) facts.push({ label: "RPA units", value: String(row.units) });
  if (row.residents != null) facts.push({ label: "Declared residents", value: String(row.residents) });
  if (row.certification) facts.push({ label: "Certification", value: row.certification });
  if (row.category) facts.push({ label: "RPA categories", value: row.category.replace(/\|/g, " · ") });
  if (row.floors) facts.push({ label: "Floors", value: String(row.floors) });
  if (row.elevators != null) facts.push({ label: "Elevators", value: String(row.elevators) });
  if (row.openedOn) facts.push({ label: "Opened", value: row.openedOn.slice(0, 4) });
  if (row.phone) facts.push({ label: "Phone", value: row.phone });
  if (row.mrc) facts.push({ label: "MRC", value: row.mrc });
  if (row.operator) facts.push({ label: "Operator", value: row.operator });
  if (row.group) facts.push({ label: "Group", value: row.group });
  const ages = row.ages;
  if (ages) {
    const parts = [
      ages.from85 != null ? `${ages.from85} × 85+` : null,
      ages.from75to84 != null ? `${ages.from75to84} × 75-84` : null,
      ages.from65to74 != null ? `${ages.from65to74} × 65-74` : null,
    ].filter(Boolean);
    if (parts.length) facts.push({ label: "Age profile", value: parts.join(" · ") });
  }
  if (row.safety && row.safety.length > 0) {
    facts.push({ label: "Safety features", value: row.safety.slice(0, 4).join(" · ") });
  }
  if (row.security) facts.push({ label: "Call for help", value: row.security });
  const staff = row.staffing;
  if (staff?.hasNursingPresence) {
    const n = staff.nursesWeekday;
    facts.push({
      label: "Nurses (weekday)",
      value: `D${n.day} / E${n.evening} / N${n.night}`,
    });
  } else if (staff && staff.aidesWeekdayDay > 0) {
    facts.push({
      label: "Aides (weekday day)",
      value: String(staff.aidesWeekdayDay),
    });
  }
  return facts;
}

function mapRow(row: RpaResidenceRow): Residence {
  const units = row.units ?? row.capacity ?? 0;
  const certified = (row.certification || "").toLowerCase().startsWith("certifi");
  const nursingService = hasService(row.services, "infirmiers");
  const nursingStaff = Boolean(row.staffing?.hasNursingPresence);
  const nursing = nursingService || nursingStaff;
  const bath = hasService(row.services, "bain");
  const meals = hasService(row.services, "repas");
  const mobility = hasService(row.services, "mobilité");
  const errance = hasService(row.services, "errance");
  const autonomy = autonomyFromCategory(row.category);
  const { unitType, unitRows } = unitSummary(row);
  const safety = row.safety || [];

  const why: string[] = [];
  if (certified) why.push("Certified in the RPA registry");
  if (meals) why.push("Meals offered");
  if (nursing) why.push(nursingStaff ? "Nursing presence declared" : "Nursing care declared");
  if (bath) why.push("Bathing assistance declared");
  if (mobility) why.push("Mobility assistance");
  if (row.entente108) why.push("Units under agreement 108");
  if (safety.length >= 3) why.push("Declared safety equipment");
  if (why.length === 0) why.push("Listing from Québec's public RPA registry");

  const consider: string[] = [
    "Rates and availability to confirm with the residence",
  ];
  if (!nursing) consider.push("Little or no declared nursing presence");
  if (errance) consider.push("Accepts residents at risk of wandering");
  if (!bath) consider.push("Bathing assistance not declared in the registry");

  const highlights = [
    categoryPhrase(row.category),
    row.capacity ? `Capacity ${row.capacity}` : null,
    nursing ? "Nursing care" : null,
    meals ? "Meals" : null,
    safety[0] || null,
  ].filter(Boolean) as string[];

  const postalPart = row.postal ? ` ${row.postal}` : "";
  const addressLine = [row.address, `${row.city} (Québec)${postalPart}`]
    .filter(Boolean)
    .join(", ");

  let base = certified ? 62 : 50;
  if (nursing) base += 10;
  if (bath) base += 4;
  if (meals) base += 3;
  if (mobility) base += 3;
  if (row.entente108) base += 2;
  if (safety.length >= 4) base += 3;

  return {
    id: row.id,
    name: row.name,
    city: `${row.city}, ${row.region}`,
    units,
    badge: certified ? "RPA registry" : row.certification || "RPA registry",
    badgeTone: certified ? "green" : "neutral",
    description: [
      `${row.name} is a ${row.type || "private residence for seniors"} in ${row.city}`,
      ` (${row.region}), ${categoryPhrase(row.category)}.`,
      row.capacity ? ` Declared capacity of ${row.capacity} people` : "",
      row.residents != null ? ` for ${row.residents} residents in the registry.` : ".",
      " Source: Québec public RPA registry (extracted 2025-12-31).",
    ].join(""),
    unitType,
    price: "On request",
    response: row.phone ? `tel. ${row.phone}` : "registry contact details",
    responseLabel: row.phone ? "Registry contact details" : "To confirm",
    area: "—",
    availability: certified ? "Applications open" : "To verify",
    availabilityTone: certified ? "green" : "terra",
    services: row.services.length > 0 ? row.services : ["To confirm"],
    partner: false,
    distanceKm: 0,
    priceAmount: 0,
    confirmed: certified,
    recommended: certified && nursing,
    compatibilityBase: Math.min(88, base),
    why,
    consider,
    unitRows,
    care: [
      { label: "Accepted autonomy level", value: autonomy.value, offered: autonomy.offered },
      {
        label: "Nursing care",
        value: nursing
          ? nursingStaff
            ? "Presence declared"
            : "Service declared"
          : "Not declared (pl)",
        offered: nursing,
      },
      { label: "Bathing assistance", value: bath ? "Declared" : "Not declared (f)", offered: bath },
      {
        label: "Memory care",
        value: errance ? "Accepts residents at risk of wandering" : "Not specified",
        offered: errance,
      },
      {
        label: "Mobility assistance",
        value: mobility ? "Declared" : "Not declared",
        offered: mobility,
      },
    ],
    location: {
      address: addressLine,
      travel: row.mrc ? `MRC ${row.mrc}` : row.region,
      transit: row.security || safety.slice(0, 2).join(" · ") || "Registry safety info",
      ...(typeof row.lat === "number" && typeof row.lng === "number"
        ? { lat: row.lat, lng: row.lng }
        : {}),
    },
    documents: [
      { name: "Proof of identity", inDossier: false },
      { name: "Medical assessment", inDossier: false },
      { name: "Medication list", inDossier: false },
    ],
    waitNote:
      "Data from the RPA registry (verifiable complete extract, 2025-12-31). Confirm rates and availability before applying.",
    photoLabels: ["Location", "Common areas", "Sample unit", "Visit"],
    facts: buildFacts(row),
    highlights,
    hasNursingStaff: nursing,
    categoryLabel: categoryPhrase(row.category),
    phone: row.phone,
  };
}

const rows = (catalog as { residences: RpaResidenceRow[] }).residences;

/** Full Active RPA Québec catalog mapped for family browse. */
export const RESIDENCES: Residence[] = rows.map(mapRow);

export const RPA_REGIONS = Array.from(new Set(rows.map((r) => r.region))).sort((a, b) =>
  a.localeCompare(b, "fr"),
);

export const RPA_SOURCE = {
  label: (catalog as { source?: string }).source ?? "RPA registry — Québec",
  extractedOn: (catalog as { extractedOn?: string }).extractedOn ?? "2025-12-31",
  count: rows.length,
};

export function filterResidences(input: {
  query?: string;
  region?: string;
  services?: string[];
  limit?: number;
}): Residence[] {
  const q = (input.query || "").trim().toLowerCase();
  const region = (input.region || "").trim();
  const needed = input.services || [];
  const limit = input.limit ?? 40;

  const matched = RESIDENCES.filter((r) => {
    if (region) {
      const regionPart = r.city.includes(",")
        ? r.city.slice(r.city.indexOf(",") + 1).trim()
        : "";
      if (regionPart !== region && !r.city.toLowerCase().includes(region.toLowerCase())) {
        return false;
      }
    }
    if (needed.length > 0 && !needed.every((s) => r.services.includes(s))) return false;
    if (!q) return true;
    const hay = `${r.name} ${r.city} ${r.location.address}`.toLowerCase();
    return hay.includes(q);
  });

  return matched.slice(0, limit);
}
