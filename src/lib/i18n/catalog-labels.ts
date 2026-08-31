/**
 * RPA / Québec catalog domain values often remain French in data.
 * Map to English keys before t() so EN locale never echoes French.
 */
export const CATALOG_LABEL_EN: Record<string, string> = {
  Logement: "Apartment",
  "Chambre simple": "Private room (single)",
  "Chambre double": "Double room",
  "Unité locative": "Rental unit",
  "Rental unit": "Rental unit",
  Repas: "Meals",
  "Soins infirmiers": "Nursing care",
  "Aide au bain": "Bathing assistance",
  "Aide à la mobilité": "Mobility assistance",
  "Aide à l'alimentation": "Meal assistance",
  "Administration des médicaments": "Medication administration",
  "Distribution des médicaments": "Medication distribution",
  "Assistance aux soins": "Care assistance",
  "Clientèle à risque d'errance": "Residents at risk of wandering",
  "Entretien des vêtements": "Laundry",
  "Entretien ménager": "Housekeeping",
  Habillage: "Dressing assistance",
  Loisirs: "Activities",
  "Soins d'hygiène": "Hygiene care",
  "Rampe d'accès": "Access ramp",
  Gicleurs: "Sprinklers",
  "Avertisseurs de fumée": "Smoke detectors",
  "Alarme incendie": "Fire alarm",
  "Système d'appel à l'aide mobile": "Mobile call-for-help system",
  "Système d'appel à l'aide fixe": "Fixed call-for-help system",
  "Système d'appel à l'aide combiné fixe et mobile":
    "Combined fixed and mobile call-for-help system",
  Génératrice: "Generator",
  "Dispositif de sécurité immeuble": "Building security device",
  "Avertisseurs de monoxyde": "Carbon monoxide detectors",
  Aucun: "None",
  Certifiée: "Certified",
  "Certifiée en processus de renouvellement": "Certified — renewal in progress",
  "Certifiée en renouvellement": "Certified — renewal",
  "Certifiée en attente de renouvellement": "Certified — awaiting renewal",
  "Attestation temporaire": "Temporary attestation",
  "Attestation temporaire échue": "Expired temporary attestation",
  "Résidence à but lucratif": "For-profit residence",
  "Organisme à but non lucratif (OBNL ou OSBL)": "Non-profit organization (NPO)",
  "Habitation à loyer modique (HLM)": "Low-rent housing (HLM)",
  "Coopérative d'habitation": "Housing cooperative",
  "Communauté religieuse": "Religious community",
  Capacité: "Capacity",
  "Unités RPA": "RPA units",
  "Résidents déclarés": "Declared residents",
  Certification: "Certification",
  "Catégories RPA": "RPA categories",
  Étages: "Floors",
  Ascenseurs: "Elevators",
  Ouverture: "Opened",
  Téléphone: "Phone",
  MRC: "MRC",
  Exploitant: "Operator",
  Regroupement: "Group",
  "Profil d'âge": "Age profile",
  Sécurité: "Safety features",
  "Appel à l'aide": "Call for help",
  "Infirmières (sem.)": "Nurses (weekday)",
  "Préposés (jour sem.)": "Aides (weekday day)",
  // Studio / care unit shorthand (console schedule)
  "2½": "2 1/2",
  "3½": "3 1/2",
  "3½ soins": "3 1/2 with care",
  "3½ services": "3 1/2 with services",
  // Move-in months (console seeds)
  "Octobre 2026": "October 2026",
  "Septembre 2026": "September 2026",
  "Novembre 2026": "November 2026",
  // Relationship values sometimes stored in FR
  Fille: "Daughter",
  Fils: "Son",
  Conjoint: "Male spouse",
  Conjointe: "Female spouse",
  "Autre proche": "Another loved one",
  "Moi-même": "Myself",
  Famille: "Family",
};

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function catalogLabel(t: TranslateFn, value: string): string {
  if (!value) return value;
  const capacity = value.match(/^Capacity\s+(\d+)$/i) || value.match(/^Capacité\s+(\d+)$/i);
  if (capacity) return t("Capacity {count}", { count: capacity[1] });
  const registry = value.match(/^(\d+)\s+in registry$/i) || value.match(/^(\d+)\s+au registre$/i);
  if (registry) return t("{count} in registry", { count: registry[1] });
  if (value.includes(" | ") || value.includes(" · ")) {
    const sep = value.includes(" | ") ? " | " : " · ";
    return value
      .split(sep)
      .map((part) => t(CATALOG_LABEL_EN[part.trim()] ?? part.trim()))
      .join(sep);
  }
  return t(CATALOG_LABEL_EN[value] ?? value);
}
