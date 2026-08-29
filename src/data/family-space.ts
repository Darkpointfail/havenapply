/**
 * Family-space catalog + UI types for the Québec family portal.
 *
 * DEPRECATED demo fixtures (USER, SENIOR, INITIAL_*, TODOS, MARGUERITE_PROFILE)
 * must not be used in production UI — wire to useFamilyData + useAuth instead.
 * RESIDENCES / UNIT_TYPES / SERVICES remain OK as a marketing browse catalog.
 */

export type FamilyView =
  | "accueil"
  | "residences"
  | "fiche"
  | "depot"
  | "dossier"
  | "demandes"
  | "assistance";

/** Create vs manage the same admission dossier. */
export type DossierPanel = "manage" | "create" | "edit";

/** Vue d'ensemble vs formulaire de renseignements. */
export type DossierMode = "overview" | "edition";

export type DocStatus = "reçu" | "en attente";

export type FamilyDoc = {
  id: string;
  name: string;
  detail: string;
  status: DocStatus;
};

/** Un dossier d'admission (une personne accompagnée). */
export type FamilyProfile = {
  id: string;
  prenom: string;
  nom: string;
  rel: string;
  photo: string | null;
  meta: string;
  autonomie: string;
  services: string;
  budget: string;
  move: string;
  draft: boolean;
  docs: FamilyDoc[];
  accesses: { residenceId: string; residenceName: string; city: string }[];
};

export type AppStatus =
  | "Demande reçue"
  | "Dossier vérifié"
  | "Visite planifiée"
  | "Liste d'attente"
  | "Décision attendue";

export type FamilyVisit = {
  dateLabel: string;
  timeLabel: string;
  place?: string;
};

export type FamilyApplication = {
  id: string;
  residenceId: string;
  residenceName: string;
  city: string;
  unit: string;
  depositedOn: string;
  status: AppStatus;
  progress: number; // 0-3 segments completed
  update: string;
  updateTone: "green" | "neutral" | "terra";
  visit?: FamilyVisit | null;
};

export type Residence = {
  id: string;
  name: string;
  city: string;
  units: number;
  badge: string;
  badgeTone: "green" | "neutral";
  description: string;
  unitType: string;
  price: string;
  response: string;
  area: string;
  availability: string;
  availabilityTone: "green" | "terra";
  services: string[];
  responseLabel: string;
  partner: boolean;
  distanceKm: number;
  priceAmount: number;
  confirmed: boolean;
  recommended?: boolean;
  why: string[];
  consider: string[];
  compatibilityBase: number;
  unitRows: {
    type: string;
    area: string;
    price: string;
    availability: string;
    availabilityTone: "green" | "terra";
  }[];
  care: { label: string; value: string; offered: boolean }[];
  location: { address: string; travel: string; transit: string };
  documents: { name: string; inDossier: boolean }[];
  waitNote: string;
  photoLabels: string[];
};

/** @deprecated Demo contact — do not use in production UI. Prefer authenticated useAuth().user. */
export const USER = {
  firstName: "Sophie",
  fullName: "Sophie Lévesque",
  initials: "SL",
};

/** @deprecated Demo senior — do not use in production UI. Prefer useFamilyData().data.senior. */
export const SENIOR = {
  firstName: "Marguerite",
  lastName: "Lévesque",
  fullName: "Marguerite Lévesque",
  age: 84,
  city: "Sillery, Québec",
  dossierCreated: "12 août 2026",
  autonomie: "Semi-autonome",
  services: "Repas, médicaments, aide légère",
  budget: "3 400 $ / mois",
  emmenagement: "Octobre 2026",
};

export const REQUIRED_DOCS: FamilyDoc[] = [
  {
    id: "id",
    name: "Pièce d'identité",
    detail: "Carte d'assurance maladie ou permis",
    status: "reçu",
  },
  {
    id: "ramq",
    name: "Carte d'assurance maladie",
    detail: "Recto et verso",
    status: "reçu",
  },
  {
    id: "bilan",
    name: "Bilan médical",
    detail: "Médecin traitant ou CLSC",
    status: "en attente",
  },
  {
    id: "meds",
    name: "Liste de médicaments",
    detail: "Ordonnance à jour",
    status: "reçu",
  },
  {
    id: "revenus",
    name: "Preuve de revenus",
    detail: "Avis de cotisation ou relevé",
    status: "en attente",
  },
  {
    id: "mandat",
    name: "Mandat de protection",
    detail: "Ou procuration le cas échéant",
    status: "reçu",
  },
];

function cloneDocs(docs: FamilyDoc[]): FamilyDoc[] {
  return docs.map((d) => ({ ...d }));
}

export function emptyDraftDocs(): FamilyDoc[] {
  return REQUIRED_DOCS.map((d) => ({ ...d, status: "en attente" as const }));
}

/** @deprecated Demo dossier — do not seed production UI. Use buildProfileFromSenior(). */
export const INITIAL_PROFILES: FamilyProfile[] = [
  {
    id: "p-marguerite",
    prenom: "Marguerite",
    nom: "Lévesque",
    rel: "Votre mère",
    photo: null,
    meta: "84 ans · Sillery, Québec · dossier créé le 12 août 2026",
    autonomie: "Semi-autonome",
    services: "Repas, médicaments, aide légère",
    budget: "3 400 $ / mois",
    move: "Octobre 2026",
    draft: false,
    docs: cloneDocs(REQUIRED_DOCS),
    accesses: [
      { residenceId: "maple-grove", residenceName: "Résidence Les Jardins du Fleuve", city: "Sainte-Foy" },
      { residenceId: "lakeside-haven", residenceName: "Manoir de la Pointe", city: "Lévis" },
      { residenceId: "cedar-memory", residenceName: "Villa Sainte-Anne", city: "Charlesbourg" },
    ],
  },
];

/** Vault categories that satisfy each REQUIRED_DOCS checklist id. */
export const REQUIRED_DOC_CATEGORIES: Record<string, string[]> = {
  id: ["identification"],
  ramq: ["insurance_card", "medicare"],
  bilan: ["physician_report"],
  meds: ["medication_list"],
  revenus: ["financial"],
  mandat: ["power_of_attorney", "guardianship"],
};

type VaultDocLike = {
  category: string;
  hasFile?: boolean;
  status?: string;
};

/** Map live vault documents onto the REQUIRED_DOCS checklist (reçu / en attente). */
export function mapRequiredDocsFromDocuments(documents: VaultDocLike[]): FamilyDoc[] {
  return REQUIRED_DOCS.map((req) => {
    const cats = REQUIRED_DOC_CATEGORIES[req.id] ?? [];
    const hit = documents.some((d) => {
      if (!cats.includes(d.category)) return false;
      if (d.hasFile) return true;
      const s = d.status || "";
      return s === "uploaded" || s === "verified" || s === "under_review";
    });
    return { ...req, status: hit ? ("reçu" as const) : ("en attente" as const) };
  });
}

type SeniorLike = {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  city?: string;
  state?: string;
  dateOfBirth?: string;
  budgetMax?: string;
  budgetUnsure?: boolean;
  urgency?: string;
  photoDataUrl?: string;
  createdAt?: string | null;
};

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function urgencyToMoveLabel(urgency?: string): string {
  const u = (urgency || "").toLowerCase();
  if (!u) return "À préciser";
  if (u.includes("immediate") || u.includes("urgent")) return "Dès que possible";
  if (u.includes("1_3") || u.includes("3_month")) return "Sous 3 mois";
  if (u.includes("3_6") || u.includes("6_month")) return "Sous 6 mois";
  if (u.includes("6_12") || u.includes("year")) return "Sous 12 mois";
  if (u.includes("exploring") || u.includes("research")) return "En exploration";
  return "À préciser";
}

/**
 * Build at most one FamilyProfile from a persisted senior.
 * Returns null when firstName or lastName is missing (empty / create-dossier state).
 */
export function buildProfileFromSenior(
  senior: SeniorLike,
  docs: FamilyDoc[] = emptyDraftDocs(),
  accesses: FamilyProfile["accesses"] = [],
): FamilyProfile | null {
  const prenom = (senior.firstName || "").trim();
  const nom = (senior.lastName || "").trim();
  if (!prenom || !nom) return null;

  const age = ageFromDob(senior.dateOfBirth);
  const place = [senior.city, senior.state].filter(Boolean).join(", ");
  const meta = [age ? `${age} ans` : null, place || null].filter(Boolean).join(" · ") || "Dossier en cours";

  let budget = "À préciser";
  if (senior.budgetUnsure) budget = "Budget à confirmer";
  else if (senior.budgetMax?.trim()) {
    const n = Number(String(senior.budgetMax).replace(/\s/g, ""));
    budget = Number.isFinite(n) && n > 0
      ? `${n.toLocaleString("fr-CA")} $ / mois`
      : `${senior.budgetMax} $ / mois`;
  }

  return {
    id: "p-senior",
    prenom,
    nom,
    rel: (senior.relationship || "").trim() || "Proche",
    photo: senior.photoDataUrl || null,
    meta,
    autonomie: "À préciser",
    services: "À préciser",
    budget,
    move: urgencyToMoveLabel(senior.urgency),
    draft: false,
    docs,
    accesses,
  };
}

export function createEmptyProfile(id: string): FamilyProfile {
  return {
    id,
    prenom: "",
    nom: "",
    rel: "Proche",
    photo: null,
    meta: "Dossier en création",
    autonomie: "À préciser",
    services: "À préciser",
    budget: "À préciser",
    move: "À préciser",
    draft: true,
    docs: emptyDraftDocs(),
    accesses: [],
  };
}

export function profileDisplayName(p: FamilyProfile) {
  const full = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
  return full || "Nouveau dossier";
}

export const RESIDENCES: Residence[] = [
  {
    id: "maple-grove",
    name: "Résidence Les Jardins du Fleuve",
    city: "Sainte-Foy, Québec",
    units: 112,
    badge: "3 unités libres",
    badgeTone: "green",
    description:
      "Résidence chaleureuse près du fleuve, avec services adaptés et une vie communautaire active. Idéale pour une transition en douceur depuis le domicile ou l'hôpital.",
    unitType: "3½ avec services",
    price: "3 620 $/mois",
    response: "réponse en 6 heures",
    responseLabel: "Réponse en 6 heures",
    area: "620 pi²",
    availability: "3 libres",
    availabilityTone: "green",
    services: ["Repas quotidiens", "Infirmerie 24 h", "Aide à la mobilité", "Activités sociales", "Transport médical"],
    partner: true,
    distanceKm: 8,
    priceAmount: 3620,
    confirmed: true,
    recommended: true,
    compatibilityBase: 92,
    why: [
      "Budget respecté",
      "Soins infirmiers disponibles",
      "Aide au bain offerte",
      "Unité recherchée disponible",
      "Située dans le secteur souhaité",
    ],
    consider: [
      "Transport non inclus dans le forfait de base",
      "Prix proche de votre budget maximal",
      "Animaux non acceptés",
    ],
    unitRows: [
      { type: "3½ avec services", area: "620 pi²", price: "3 620 $/mois", availability: "3 libres", availabilityTone: "green" },
      { type: "2½", area: "480 pi²", price: "2 850 $/mois", availability: "Complet", availabilityTone: "terra" },
      { type: "1½", area: "320 pi²", price: "2 200 $/mois", availability: "2 libres", availabilityTone: "green" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "Semi-autonome à assistance légère", offered: true },
      { label: "Soins infirmiers", value: "Offerts 24 h", offered: true },
      { label: "Aide au bain", value: "Incluse", offered: true },
      { label: "Soins de mémoire", value: "Non offerts", offered: false },
    ],
    location: {
      address: "2140 chemin du Fleuve, Sainte-Foy (Québec)",
      travel: "8 km · environ 15 minutes depuis Sillery",
      transit: "Desserte RTC à 4 minutes à pied",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: true },
      { name: "Bilan médical", inDossier: false },
      { name: "Liste de médicaments", inDossier: true },
      { name: "Preuve de revenus", inDossier: false },
    ],
    waitNote: "Les disponibilités sont mises à jour chaque semaine par la résidence partenaire.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
  {
    id: "lakeside-haven",
    name: "Manoir de la Pointe",
    city: "Lévis",
    units: 74,
    badge: "liste d'attente",
    badgeTone: "neutral",
    description:
      "Établissement plus intime offrant des soins renforcés. Liste d'attente active, dossiers complets priorisés selon l'urgence clinique.",
    unitType: "3½ avec soins",
    price: "3 950 $/mois",
    response: "attente estimée 2 à 4 mois",
    responseLabel: "Réponse en 2 jours",
    area: "640 pi²",
    availability: "Complet",
    availabilityTone: "terra",
    services: ["Soins infirmiers", "Aide complète", "Repas adaptés", "Surveillance 24 h"],
    partner: true,
    distanceKm: 21,
    priceAmount: 3950,
    confirmed: true,
    recommended: true,
    compatibilityBase: 81,
    why: [
      "Soins infirmiers en continu",
      "Aide au bain offerte",
      "Petit milieu de vie recherché",
      "Unité 3½ disponible à moyen terme",
    ],
    consider: [
      "Prix supérieur au budget indiqué",
      "Liste d'attente de deux à quatre mois",
      "Secteur plus éloigné de la famille",
    ],
    unitRows: [
      { type: "3½ avec soins", area: "640 pi²", price: "3 950 $/mois", availability: "Liste d'attente", availabilityTone: "terra" },
      { type: "2½", area: "500 pi²", price: "3 400 $/mois", availability: "Complet", availabilityTone: "terra" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "Assistance à soins intermédiaires", offered: true },
      { label: "Soins infirmiers", value: "Offerts en continu", offered: true },
      { label: "Aide au bain", value: "Incluse", offered: true },
      { label: "Soins de mémoire", value: "Unité dédiée disponible", offered: true },
    ],
    location: {
      address: "880 rue de la Pointe, Lévis",
      travel: "21 km · environ 30 minutes depuis Sillery",
      transit: "Ligne STLévis à proximité",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: true },
      { name: "Bilan médical", inDossier: false },
      { name: "Évaluation d'autonomie", inDossier: false },
      { name: "Liste de médicaments", inDossier: true },
    ],
    waitNote: "Le délai d'attente varie selon l'urgence clinique et la complétude du dossier.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
  {
    id: "cedar-memory",
    name: "Villa Sainte-Anne",
    city: "Charlesbourg, Québec",
    units: 138,
    badge: "1 unité libre",
    badgeTone: "green",
    description:
      "Grande résidence en Charlesbourg, unités lumineuses et délais de réponse rapides. Bon compromis prix–services pour un profil semi-autonome.",
    unitType: "3½",
    price: "3 280 $/mois",
    response: "réponse en 2 jours",
    responseLabel: "Réponse en 2 jours",
    area: "580 pi²",
    availability: "1 libre",
    availabilityTone: "green",
    services: ["Repas", "Entretien ménager", "Activités", "Infirmerie de jour", "Transport adapté"],
    partner: true,
    distanceKm: 16,
    priceAmount: 3280,
    confirmed: true,
    recommended: true,
    compatibilityBase: 76,
    why: [
      "Budget respecté",
      "Transport adapté inclus",
      "Unité 3½ disponible",
      "Activités quotidiennes",
    ],
    consider: [
      "Soins infirmiers offerts le jour seulement",
      "Aide au bain à la carte",
      "Une seule unité libre",
    ],
    unitRows: [
      { type: "3½", area: "580 pi²", price: "3 280 $/mois", availability: "1 libre", availabilityTone: "green" },
      { type: "2½", area: "460 pi²", price: "2 760 $/mois", availability: "Complet", availabilityTone: "terra" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "Semi-autonome", offered: true },
      { label: "Soins infirmiers", value: "Jour seulement", offered: true },
      { label: "Aide au bain", value: "À la carte", offered: false },
      { label: "Soins de mémoire", value: "Non offerts", offered: false },
    ],
    location: {
      address: "4500 1re Avenue, Charlesbourg (Québec)",
      travel: "16 km · environ 22 minutes depuis Sillery",
      transit: "Parcours RTC régulier à proximité",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: true },
      { name: "Bilan médical", inDossier: false },
      { name: "Liste de médicaments", inDossier: true },
      { name: "Preuve de revenus", inDossier: false },
    ],
    waitNote: "Une seule unité 3½ est libre ; les autres types sont complets.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
  {
    id: "erable",
    name: "Le Domaine des Érables",
    city: "Beauport, Québec",
    units: 96,
    badge: "à vérifier",
    badgeTone: "neutral",
    description:
      "Résidence indépendante hors réseau partenaire HavenApply. Les tarifs et disponibilités doivent être confirmés directement.",
    unitType: "3½",
    price: "2 950 $/mois",
    response: "à confirmer",
    responseLabel: "À confirmer",
    area: "540 pi²",
    availability: "À vérifier",
    availabilityTone: "terra",
    services: ["Repas", "Loisirs"],
    partner: false,
    distanceKm: 19,
    priceAmount: 2950,
    confirmed: false,
    compatibilityBase: 58,
    why: ["Budget sous le plafond indiqué", "Secteur accessible depuis Québec"],
    consider: ["Information à vérifier auprès de la résidence", "Non partenaire HavenApply"],
    unitRows: [
      { type: "3½", area: "540 pi²", price: "2 950 $/mois", availability: "À vérifier", availabilityTone: "terra" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "À confirmer", offered: false },
      { label: "Soins infirmiers", value: "À confirmer", offered: false },
      { label: "Aide au bain", value: "À confirmer", offered: false },
      { label: "Soins de mémoire", value: "À confirmer", offered: false },
    ],
    location: {
      address: "1200 avenue des Érables, Beauport",
      travel: "19 km · environ 25 minutes depuis Sillery",
      transit: "Desserte locale à confirmer",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: true },
      { name: "Bilan médical", inDossier: false },
    ],
    waitNote: "Les renseignements affichés n'ont pas été confirmés par la résidence.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
  {
    id: "vieux-port",
    name: "Résidence du Vieux-Port",
    city: "Québec",
    units: 64,
    badge: "à vérifier",
    badgeTone: "neutral",
    description:
      "Petite résidence en centre-ville. Hors réseau partenaire : l'envoi de dossier en ligne n'est pas disponible.",
    unitType: "2½",
    price: "4 100 $/mois",
    response: "à confirmer",
    responseLabel: "À confirmer",
    area: "420 pi²",
    availability: "À vérifier",
    availabilityTone: "terra",
    services: ["Repas", "Conciergerie"],
    partner: false,
    distanceKm: 11,
    priceAmount: 4100,
    confirmed: false,
    compatibilityBase: 49,
    why: ["Proximité du centre-ville"],
    consider: ["Prix au-dessus du budget", "Information à vérifier", "Non partenaire HavenApply"],
    unitRows: [
      { type: "2½", area: "420 pi²", price: "4 100 $/mois", availability: "À vérifier", availabilityTone: "terra" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "À confirmer", offered: false },
      { label: "Soins infirmiers", value: "À confirmer", offered: false },
      { label: "Aide au bain", value: "À confirmer", offered: false },
      { label: "Soins de mémoire", value: "Non", offered: false },
    ],
    location: {
      address: "18 rue Saint-Pierre, Québec",
      travel: "11 km · environ 18 minutes depuis Sillery",
      transit: "Très bien desservi",
    },
    documents: [{ name: "Pièce d'identité", inDossier: true }],
    waitNote: "Coordonnées à utiliser pour une prise de contact directe.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
  {
    id: "cap-rouge",
    name: "Habitations Cap-Rouge",
    city: "Cap-Rouge, Québec",
    units: 88,
    badge: "2 unités libres",
    badgeTone: "green",
    description:
      "Résidence partenaire dans le secteur ouest, adaptée à un profil semi-autonome avec un budget plus serré.",
    unitType: "3½",
    price: "2 780 $/mois",
    response: "réponse en 1 jour",
    responseLabel: "Réponse en 1 jour",
    area: "560 pi²",
    availability: "2 libres",
    availabilityTone: "green",
    services: ["Repas", "Entretien", "Activités", "Transport"],
    partner: true,
    distanceKm: 13,
    priceAmount: 2780,
    confirmed: true,
    compatibilityBase: 71,
    why: ["Budget largement respecté", "Deux unités libres", "Transport offert"],
    consider: ["Soins infirmiers limités", "Aide au bain à la carte"],
    unitRows: [
      { type: "3½", area: "560 pi²", price: "2 780 $/mois", availability: "2 libres", availabilityTone: "green" },
      { type: "2½", area: "430 pi²", price: "2 350 $/mois", availability: "Complet", availabilityTone: "terra" },
    ],
    care: [
      { label: "Niveau d'autonomie accepté", value: "Semi-autonome", offered: true },
      { label: "Soins infirmiers", value: "Présence diurne", offered: true },
      { label: "Aide au bain", value: "À la carte", offered: false },
      { label: "Soins de mémoire", value: "Non offerts", offered: false },
    ],
    location: {
      address: "4500 boulevard Chaudière, Cap-Rouge",
      travel: "13 km · environ 20 minutes depuis Sillery",
      transit: "Parcours RTC de banlieue",
    },
    documents: [
      { name: "Pièce d'identité", inDossier: true },
      { name: "Bilan médical", inDossier: false },
      { name: "Liste de médicaments", inDossier: true },
    ],
    waitNote: "Disponibilités confirmées par la résidence partenaire.",
    photoLabels: ["Salle à manger", "Unité type", "Espaces communs", "Visite virtuelle"],
  },
];

/** @deprecated Demo care profile — do not default match scoring to this. Prefer live senior care needs. */
export const MARGUERITE_PROFILE = {
  budgetMax: 3700,
  sector: "Québec et Lévis",
  needsNursing: true,
  needsBathHelp: true,
  unitPreference: "3½",
  maxDistanceKm: 25,
} as const;

/** @deprecated Demo applications — never fall back to these in production UI. */
export const INITIAL_APPLICATIONS: FamilyApplication[] = [
  {
    id: "a1",
    residenceId: "maple-grove",
    residenceName: "Résidence Les Jardins du Fleuve",
    city: "Sainte-Foy",
    unit: "3½ avec services",
    depositedOn: "22 août 2026",
    status: "Visite planifiée",
    progress: 2,
    update: "Visite planifiée le 3 septembre à 14 h.",
    updateTone: "green",
    visit: {
      dateLabel: "3 septembre 2026",
      timeLabel: "14 h 00",
      place: "Résidence Les Jardins du Fleuve · Sainte-Foy",
    },
  },
  {
    id: "a2",
    residenceId: "lakeside-haven",
    residenceName: "Manoir de la Pointe",
    city: "Lévis",
    unit: "3½ avec soins",
    depositedOn: "20 août 2026",
    status: "Liste d'attente",
    progress: 1,
    update: "Placé en liste d'attente — rang communiqué par la résidence.",
    updateTone: "neutral",
  },
  {
    id: "a3",
    residenceId: "cedar-memory",
    residenceName: "Villa Sainte-Anne",
    city: "Charlesbourg",
    unit: "3½",
    depositedOn: "24 août 2026",
    status: "Dossier vérifié",
    progress: 1,
    update: "Dossier vérifié. Décision attendue sous peu.",
    updateTone: "green",
  },
];

export const PROFILE_STEPS = [
  "Demandeur",
  "Contacts",
  "Statut légal",
  "Assurances",
  "Finances",
  "Soins",
  "Signature",
] as const;

/** @deprecated Static Sophie todos — compute next steps from live gaps instead. */
export const TODOS = [
  { label: "Ajouter le bilan médical", owner: "Sophie", tone: "terra" as const },
  { label: "Ajouter la preuve de revenus", owner: "Sophie", tone: "terra" as const },
  { label: "Confirmer la visite du 3 septembre", owner: "Sophie", tone: "green" as const },
  { label: "Relire le dossier transmis à Villa Sainte-Anne", owner: "Famille", tone: "neutral" as const },
];

export type FamilyNextStep = {
  label: string;
  owner: string;
  tone: "terra" | "green" | "neutral";
};

/** Derive « Prochaines étapes » from real dossier / docs / applications gaps. */
export function buildNextSteps(input: {
  hasSeniorProfile: boolean;
  docs: FamilyDoc[];
  applicationsCount: number;
  ownerLabel?: string;
}): FamilyNextStep[] {
  const owner = (input.ownerLabel || "").trim() || "Vous";
  const steps: FamilyNextStep[] = [];

  if (!input.hasSeniorProfile) {
    steps.push({
      label: "Créer le dossier de votre proche",
      owner,
      tone: "terra",
    });
  }

  for (const doc of input.docs.filter((d) => d.status === "en attente").slice(0, 3)) {
    steps.push({
      label: `Ajouter ${doc.name.charAt(0).toLowerCase()}${doc.name.slice(1)}`,
      owner,
      tone: "terra",
    });
  }

  if (input.hasSeniorProfile && input.applicationsCount === 0) {
    steps.push({
      label: "Déposer une première demande",
      owner,
      tone: "neutral",
    });
  }

  if (steps.length === 0) {
    steps.push({
      label: "Aucune action urgente pour le moment",
      owner: "HavenApply",
      tone: "green",
    });
  }

  return steps;
}

export const UNIT_TYPES = ["3½", "2½", "1½"] as const;
export const SERVICES = ["Repas", "Soins infirmiers", "Transport", "Aide au bain"] as const;

export function docsProgress(docs: FamilyDoc[]) {
  const received = docs.filter((d) => d.status === "reçu").length;
  const total = docs.length;
  return {
    received,
    total,
    percent: Math.round((received / total) * 100),
    next: docs.find((d) => d.status === "en attente")?.name ?? null,
  };
}
