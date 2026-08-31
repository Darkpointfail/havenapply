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
  roomsSingle: number | null;
  roomsDouble: number | null;
  apartments: number | null;
  services: string[];
  security: string | null;
  entente108: boolean;
  sourceDate: string | null;
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
  if (cats.includes("4")) {
    return { value: "Assistance à soins intermédiaires", offered: true };
  }
  if (cats.includes("3")) {
    return { value: "Assistance", offered: true };
  }
  if (cats.includes("2")) {
    return { value: "Semi-autonome à assistance légère", offered: true };
  }
  if (cats.includes("1")) {
    return { value: "Autonome", offered: true };
  }
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

function mapRow(row: RpaResidenceRow): Residence {
  const units = row.units ?? row.capacity ?? 0;
  const certified = (row.certification || "").toLowerCase().startsWith("certifi");
  const nursing = hasService(row.services, "infirmiers");
  const bath = hasService(row.services, "bain");
  const meals = hasService(row.services, "repas");
  const mobility = hasService(row.services, "mobilité");
  const errance = hasService(row.services, "errance");
  const autonomy = autonomyFromCategory(row.category);
  const { unitType, unitRows } = unitSummary(row);

  const why: string[] = [];
  if (certified) why.push("Inscrite et certifiée au registre des RPA");
  if (meals) why.push("Repas offerts");
  if (nursing) why.push("Soins infirmiers déclarés");
  if (bath) why.push("Aide au bain déclarée");
  if (row.entente108) why.push("Unités avec entente 108");
  if (why.length === 0) why.push("Fiche issue du registre public des RPA du Québec");

  const consider: string[] = [
    "Tarifs et disponibilités à confirmer auprès de la résidence",
    "HavenApply n'est pas le gestionnaire de cette RPA",
  ];
  if (!nursing) consider.push("Soins infirmiers non déclarés au registre");
  if (errance) consider.push("Accueille une clientèle à risque d'errance");

  const badge = certified ? "Registre RPA" : row.certification || "Registre RPA";
  const postalPart = row.postal ? ` ${row.postal}` : "";
  const addressLine = [row.address, `${row.city} (Québec)${postalPart}`]
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    name: row.name,
    city: `${row.city}, ${row.region}`,
    units,
    badge,
    badgeTone: certified ? "green" : "neutral",
    description: [
      `${row.name} est une ${row.type || "résidence privée pour aînés"} en ${row.city}`,
      `(${row.region}), ${categoryPhrase(row.category)}.`,
      row.capacity
        ? ` Capacité déclarée : ${row.capacity} personnes.`
        : "",
      " Données du registre public des RPA du Québec.",
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
    compatibilityBase: certified ? (nursing ? 72 : 64) : 52,
    why,
    consider,
    unitRows,
    care: [
      { label: "Niveau d'autonomie accepté", value: autonomy.value, offered: autonomy.offered },
      {
        label: "Soins infirmiers",
        value: nursing ? "Déclarés au registre" : "Non déclarés",
        offered: nursing,
      },
      {
        label: "Aide au bain",
        value: bath ? "Déclarée" : "Non déclarée",
        offered: bath,
      },
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
      transit: row.security || "Sécurité déclarée au registre",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: false },
      { name: "Bilan médical", inDossier: false },
      { name: "Liste de médicaments", inDossier: false },
    ],
    waitNote:
      "Capacité, services et certification issus du registre des RPA (extraction 2025-12-31). Vérifiez auprès de la résidence avant de déposer.",
    photoLabels: ["Extérieur", "Espaces communs", "Unité type", "Visite"],
  };
}

const rows = (catalog as { residences: RpaResidenceRow[] }).residences;

/** Full Active RPA Québec catalog mapped for family browse. */
export const RESIDENCES: Residence[] = rows.map(mapRow);

export const RPA_REGIONS = Array.from(
  new Set(rows.map((r) => r.region)),
).sort((a, b) => a.localeCompare(b, "fr"));

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
    if (needed.length > 0 && !needed.every((s) => r.services.includes(s))) {
      return false;
    }
    if (!q) return true;
    const hay = `${r.name} ${r.city} ${r.location.address}`.toLowerCase();
    return hay.includes(q);
  });

  return matched.slice(0, limit);
}
