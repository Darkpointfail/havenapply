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
  "1": "catégorie 1 (autonomie)",
  "2": "catégorie 2 (assistance légère)",
  "3": "catégorie 3 (assistance)",
  "4": "catégorie 4 (soins)",
};

function categoryPhrase(raw: string): string {
  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((c) => CATEGORY_LABELS[c] ?? `catégorie ${c}`);
  if (parts.length === 0) return "catégorie non précisée";
  if (parts.length === 1) return parts[0];
  return parts.join(" et ");
}

function autonomyFromCategory(raw: string): { value: string; offered: boolean } {
  const cats = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (cats.includes("4")) return { value: "Assistance à soins intermédiaires", offered: true };
  if (cats.includes("3")) return { value: "Assistance", offered: true };
  if (cats.includes("2")) return { value: "Semi-autonome à assistance légère", offered: true };
  if (cats.includes("1")) return { value: "Autonome", offered: true };
  return { value: "À confirmer", offered: false };
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
      price: "Sur demande",
      availability: `${row.apartments} au registre`,
      availabilityTone: "green",
    });
  }
  if ((row.roomsSingle ?? 0) > 0) {
    rows.push({
      type: "Chambre simple",
      area: "—",
      price: "Sur demande",
      availability: `${row.roomsSingle} au registre`,
      availabilityTone: "green",
    });
  }
  if ((row.roomsDouble ?? 0) > 0) {
    rows.push({
      type: "Chambre double",
      area: "—",
      price: "Sur demande",
      availability: `${row.roomsDouble} au registre`,
      availabilityTone: "green",
    });
  }
  if (rows.length === 0) {
    rows.push({
      type: "Unité locative",
      area: "—",
      price: "Sur demande",
      availability: "À confirmer",
      availabilityTone: "terra",
    });
  }
  return { unitType: rows[0].type, unitRows: rows };
}

function buildFacts(row: RpaResidenceRow): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (row.capacity) facts.push({ label: "Capacité", value: `${row.capacity} personnes` });
  if (row.units) facts.push({ label: "Unités RPA", value: String(row.units) });
  if (row.residents != null) facts.push({ label: "Résidents déclarés", value: String(row.residents) });
  if (row.certification) facts.push({ label: "Certification", value: row.certification });
  if (row.category) facts.push({ label: "Catégories RPA", value: row.category.replace(/\|/g, " · ") });
  if (row.floors) facts.push({ label: "Étages", value: String(row.floors) });
  if (row.elevators != null) facts.push({ label: "Ascenseurs", value: String(row.elevators) });
  if (row.openedOn) facts.push({ label: "Ouverture", value: row.openedOn.slice(0, 4) });
  if (row.phone) facts.push({ label: "Téléphone", value: row.phone });
  if (row.mrc) facts.push({ label: "MRC", value: row.mrc });
  if (row.operator) facts.push({ label: "Exploitant", value: row.operator });
  if (row.group) facts.push({ label: "Regroupement", value: row.group });
  const ages = row.ages;
  if (ages) {
    const parts = [
      ages.from85 != null ? `${ages.from85} × 85+` : null,
      ages.from75to84 != null ? `${ages.from75to84} × 75-84` : null,
      ages.from65to74 != null ? `${ages.from65to74} × 65-74` : null,
    ].filter(Boolean);
    if (parts.length) facts.push({ label: "Profil d'âge", value: parts.join(" · ") });
  }
  if (row.safety && row.safety.length > 0) {
    facts.push({ label: "Sécurité", value: row.safety.slice(0, 4).join(" · ") });
  }
  if (row.security) facts.push({ label: "Appel à l'aide", value: row.security });
  const staff = row.staffing;
  if (staff?.hasNursingPresence) {
    const n = staff.nursesWeekday;
    facts.push({
      label: "Infirmières (sem.)",
      value: `J${n.day} / S${n.evening} / N${n.night}`,
    });
  } else if (staff && staff.aidesWeekdayDay > 0) {
    facts.push({
      label: "Préposés (jour sem.)",
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
  if (certified) why.push("Certifiée au registre des RPA");
  if (meals) why.push("Repas offerts");
  if (nursing) why.push(nursingStaff ? "Présence infirmière déclarée" : "Soins infirmiers déclarés");
  if (bath) why.push("Aide au bain déclarée");
  if (mobility) why.push("Aide à la mobilité");
  if (row.entente108) why.push("Unités avec entente 108");
  if (safety.length >= 3) why.push("Équipements de sécurité déclarés");
  if (why.length === 0) why.push("Fiche issue du registre public des RPA du Québec");

  const consider: string[] = [
    "Tarifs et disponibilités à confirmer auprès de la résidence",
  ];
  if (!nursing) consider.push("Peu ou pas de présence infirmière déclarée");
  if (errance) consider.push("Accueille une clientèle à risque d'errance");
  if (!bath) consider.push("Aide au bain non déclarée au registre");

  const highlights = [
    categoryPhrase(row.category),
    row.capacity ? `Capacité ${row.capacity}` : null,
    nursing ? "Soins infirmiers" : null,
    meals ? "Repas" : null,
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
    badge: certified ? "Registre RPA" : row.certification || "Registre RPA",
    badgeTone: certified ? "green" : "neutral",
    description: [
      `${row.name} est une ${row.type || "résidence privée pour aînés"} à ${row.city}`,
      ` (${row.region}), ${categoryPhrase(row.category)}.`,
      row.capacity ? ` Capacité déclarée de ${row.capacity} personnes` : "",
      row.residents != null ? ` pour ${row.residents} résidents au registre.` : ".",
      " Source : registre public des RPA du Québec (extraction 2025-12-31).",
    ].join(""),
    unitType,
    price: "Sur demande",
    response: row.phone ? `tél. ${row.phone}` : "coordonnées au registre",
    responseLabel: row.phone ? "Coordonnées au registre" : "À confirmer",
    area: "—",
    availability: certified ? "Inscription ouverte" : "À vérifier",
    availabilityTone: certified ? "green" : "terra",
    services: row.services.length > 0 ? row.services : ["À confirmer"],
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
      { label: "Niveau d'autonomie accepté", value: autonomy.value, offered: autonomy.offered },
      {
        label: "Soins infirmiers",
        value: nursing
          ? nursingStaff
            ? "Présence déclarée"
            : "Service déclaré"
          : "Non déclarés",
        offered: nursing,
      },
      { label: "Aide au bain", value: bath ? "Déclarée" : "Non déclarée", offered: bath },
      {
        label: "Soins de mémoire",
        value: errance ? "Clientèle à risque d'errance accueillie" : "Non précisés",
        offered: errance,
      },
      {
        label: "Aide à la mobilité",
        value: mobility ? "Déclarée" : "Non déclarée",
        offered: mobility,
      },
    ],
    location: {
      address: addressLine,
      travel: row.mrc ? `MRC ${row.mrc}` : row.region,
      transit: row.security || safety.slice(0, 2).join(" · ") || "Sécurité au registre",
      ...(typeof row.lat === "number" && typeof row.lng === "number"
        ? { lat: row.lat, lng: row.lng }
        : {}),
    },
    documents: [
      { name: "Pièce d'identité", inDossier: false },
      { name: "Bilan médical", inDossier: false },
      { name: "Liste de médicaments", inDossier: false },
    ],
    waitNote:
      "Données du registre des RPA (complet vérifiable, extraction 2025-12-31). Vérifiez tarifs et disponibilités avant de déposer.",
    photoLabels: ["Emplacement", "Espaces communs", "Unité type", "Visite"],
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
  label: (catalog as { source?: string }).source ?? "Registre des RPA — Québec",
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
