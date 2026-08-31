/**
 * Family-space catalog + UI types for the Québec family portal.
 *
 * DEPRECATED demo fixtures (USER, SENIOR, INITIAL_*, TODOS, MARGUERITE_PROFILE)
 * must not be used in production UI — wire to useFamilyData + useAuth instead.
 * RESIDENCES is the Active RPA Québec registry catalog (see rpa-quebec.ts).
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
  /**
   * Who the dossier is for.
   * - self: the logged-in person is the resident
   * - proche: the logged-in person helps a relative/friend
   * - "" : not chosen yet (first wizard step)
   */
  profileSubject: "" | "self" | "proche";
  /** Relationship to the resident when profileSubject is proche, or "Moi-même" when self. */
  rel: string;
  photo: string | null;
  /** ISO date (yyyy-mm-dd) when known. */
  dateNaissance: string;
  sexe: string;
  adresse: string;
  ville: string;
  province: string;
  codePostal: string;
  /** Contacts */
  contactPrincipalNom: string;
  contactPrincipalLien: string;
  contactPrincipalTel: string;
  contactPrincipalCourriel: string;
  contactSecondaireNom: string;
  contactSecondaireLien: string;
  contactSecondaireTel: string;
  contactSecondaireCourriel: string;
  /** Statut légal */
  mandatProtection: string;
  procuration: string;
  curatelle: string;
  directivesMedicales: string;
  nomMandataire: string;
  /** Assurances */
  assuranceMaladie: string;
  assurancePrivee: string;
  numeroPolice: string;
  assuranceVie: string;
  /** Finances */
  revenusMensuels: string;
  sourcesRevenus: string;
  garantFinancier: string;
  modePaiement: string;
  meta: string;
  autonomie: string;
  /**
   * Physical autonomy on a 1–10 scale (1 = not autonomous, 10 = fully autonomous).
   * Null when not yet set.
   */
  autonomyScore: number | null;
  services: string;
  /** Soins */
  mobilite: string;
  aideRepas: string;
  aideHygiene: string;
  aideMedication: string;
  allergies: string;
  regimeAlimentaire: string;
  budget: string;
  move: string;
  /** What the family is searching for (distinct from care needs). */
  searchSector: string;
  searchRadiusKm: number | null;
  searchBudgetMax: number | null;
  searchSize: "any" | "small" | "medium" | "large";
  searchMinRating: number | null;
  priorityCare: number;
  priorityGeo: number;
  priorityBudget: number;
  prioritySize: number;
  priorityRating: number;
  /** Signature */
  consentPartage: boolean;
  signatureNom: string;
  signatureDate: string;
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
  location: { address: string; travel: string; transit: string; lat?: number; lng?: number };
  documents: { name: string; inDossier: boolean }[];
  waitNote: string;
  photoLabels: string[];
  /** Easy-scan facts for the establishment fiche. */
  facts?: { label: string; value: string }[];
  highlights?: string[];
  hasNursingStaff?: boolean;
  categoryLabel?: string;
  phone?: string | null;
  /** Google Places rating 1–5 when available; omitted from score when null. */
  googleRating?: number | null;
  googleRatingCount?: number | null;
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
    profileSubject: "proche",
    rel: "Votre mère",
    photo: null,
    dateNaissance: "1942-03-15",
    sexe: "Femme",
    adresse: "1200 chemin Saint-Louis",
    ville: "Sillery",
    province: "Québec",
    codePostal: "G1S 1E1",
    contactPrincipalNom: "",
    contactPrincipalLien: "",
    contactPrincipalTel: "",
    contactPrincipalCourriel: "",
    contactSecondaireNom: "",
    contactSecondaireLien: "",
    contactSecondaireTel: "",
    contactSecondaireCourriel: "",
    mandatProtection: "",
    procuration: "",
    curatelle: "",
    directivesMedicales: "",
    nomMandataire: "",
    assuranceMaladie: "RAMQ",
    assurancePrivee: "",
    numeroPolice: "",
    assuranceVie: "",
    revenusMensuels: "",
    sourcesRevenus: "",
    garantFinancier: "",
    modePaiement: "",
    meta: "84 ans · Sillery, Québec · dossier créé le 12 août 2026",
    autonomie: "Semi-autonome",
    autonomyScore: 5,
    services: "Repas, médicaments, aide légère",
    mobilite: "",
    aideRepas: "",
    aideHygiene: "",
    aideMedication: "",
    allergies: "",
    regimeAlimentaire: "",
    budget: "3 400 $ / mois",
    move: "Octobre 2026",
    searchSector: "Sillery",
    searchRadiusKm: 25,
    searchBudgetMax: 3400,
    searchSize: "any",
    searchMinRating: null,
    priorityCare: 5,
    priorityGeo: 4,
    priorityBudget: 3,
    prioritySize: 2,
    priorityRating: 2,
    consentPartage: false,
    signatureNom: "",
    signatureDate: "",
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
  filledBy?: string;
  city?: string;
  state?: string;
  address?: string;
  zip?: string;
  dateOfBirth?: string;
  gender?: string;
  budgetMax?: string;
  budgetUnsure?: boolean;
  urgency?: string;
  photoDataUrl?: string;
  createdAt?: string | null;
  searchZones?: { id?: string; query?: string; radiusMiles?: number }[];
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
 * Build at most one FamilyProfile from a persisted senior (+ optional resident dossier).
 * When `allowIncomplete` is true, returns a draft profile even if first/last name are missing
 * (in-progress dossier creation).
 */
export function buildProfileFromSenior(
  senior: SeniorLike,
  docs: FamilyDoc[] = emptyDraftDocs(),
  accesses: FamilyProfile["accesses"] = [],
  opts?: { allowIncomplete?: boolean },
): FamilyProfile | null {
  const prenom = (senior.firstName || "").trim();
  const nom = (senior.lastName || "").trim();
  if ((!prenom || !nom) && !opts?.allowIncomplete) return null;

  const age = ageFromDob(senior.dateOfBirth);
  const place = [senior.city, senior.state].filter(Boolean).join(", ");
  const meta =
    [age ? `${age} ans` : null, place || null].filter(Boolean).join(" · ") ||
    (prenom || nom ? "Dossier en cours" : "Dossier en création");

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
    profileSubject: (() => {
      const rel = (senior.relationship || "").toLowerCase();
      const filled = (senior.filledBy || "").toLowerCase();
      if (
        rel.includes("moi-même") ||
        rel.includes("moi-meme") ||
        rel.includes("myself") ||
        filled.includes("pour moi") ||
        filled.includes("looking for myself")
      ) {
        return "self";
      }
      if ((senior.relationship || "").trim() || (senior.filledBy || "").trim()) return "proche";
      return "";
    })(),
    rel: (senior.relationship || "").trim(),
    photo: senior.photoDataUrl || null,
    dateNaissance: (senior.dateOfBirth || "").trim(),
    sexe: (senior.gender || "").trim(),
    adresse: (senior.address || "").trim(),
    ville: (senior.city || "").trim(),
    province: (senior.state || "").trim() || "Québec",
    codePostal: (senior.zip || "").trim(),
    contactPrincipalNom: "",
    contactPrincipalLien: "",
    contactPrincipalTel: "",
    contactPrincipalCourriel: "",
    contactSecondaireNom: "",
    contactSecondaireLien: "",
    contactSecondaireTel: "",
    contactSecondaireCourriel: "",
    mandatProtection: "",
    procuration: "",
    curatelle: "",
    directivesMedicales: "",
    nomMandataire: "",
    assuranceMaladie: "RAMQ",
    assurancePrivee: "",
    numeroPolice: "",
    assuranceVie: "",
    revenusMensuels: "",
    sourcesRevenus: "",
    garantFinancier: "",
    modePaiement: "",
    meta,
    autonomie: "À préciser",
    autonomyScore: null,
    services: "À préciser",
    mobilite: "",
    aideRepas: "",
    aideHygiene: "",
    aideMedication: "",
    allergies: "",
    regimeAlimentaire: "",
    budget,
    move: urgencyToMoveLabel(senior.urgency),
    searchSector: (senior.searchZones?.[0]?.query || "").trim() || (senior.city || "").trim(),
    searchRadiusKm: senior.searchZones?.[0]?.radiusMiles
      ? Math.round(Number(senior.searchZones[0].radiusMiles) * 1.609)
      : null,
    searchBudgetMax: (() => {
      const n = Number(String(senior.budgetMax || "").replace(/\s/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    searchSize: "any",
    searchMinRating: null,
    priorityCare: 5,
    priorityGeo: 4,
    priorityBudget: 3,
    prioritySize: 2,
    priorityRating: 2,
    consentPartage: false,
    signatureNom: "",
    signatureDate: "",
    draft: !(prenom && nom),
    docs,
    accesses,
  };
}

/** True when senior or dossier already holds in-progress creation data. */
export function hasInProgressFamilyDossier(
  senior: SeniorLike,
  dossier?: { startedAt?: string | null; firstName?: string; lastName?: string } | null,
): boolean {
  if ((senior.firstName || "").trim() || (senior.lastName || "").trim()) return true;
  if ((senior.city || "").trim() || (senior.address || "").trim()) return true;
  if (dossier?.startedAt) return true;
  if ((dossier?.firstName || "").trim() || (dossier?.lastName || "").trim()) return true;
  return false;
}

export function createEmptyProfile(id: string): FamilyProfile {
  return {
    id,
    prenom: "",
    nom: "",
    profileSubject: "",
    rel: "",
    photo: null,
    dateNaissance: "",
    sexe: "",
    adresse: "",
    ville: "",
    province: "Québec",
    codePostal: "",
    contactPrincipalNom: "",
    contactPrincipalLien: "",
    contactPrincipalTel: "",
    contactPrincipalCourriel: "",
    contactSecondaireNom: "",
    contactSecondaireLien: "",
    contactSecondaireTel: "",
    contactSecondaireCourriel: "",
    mandatProtection: "",
    procuration: "",
    curatelle: "",
    directivesMedicales: "",
    nomMandataire: "",
    assuranceMaladie: "RAMQ",
    assurancePrivee: "",
    numeroPolice: "",
    assuranceVie: "",
    revenusMensuels: "",
    sourcesRevenus: "",
    garantFinancier: "",
    modePaiement: "",
    meta: "Dossier en création",
    autonomie: "À préciser",
    autonomyScore: null,
    services: "À préciser",
    mobilite: "",
    aideRepas: "",
    aideHygiene: "",
    aideMedication: "",
    allergies: "",
    regimeAlimentaire: "",
    budget: "À préciser",
    move: "À préciser",
    searchSector: "",
    searchRadiusKm: null,
    searchBudgetMax: null,
    searchSize: "any",
    searchMinRating: null,
    priorityCare: 5,
    priorityGeo: 4,
    priorityBudget: 3,
    prioritySize: 2,
    priorityRating: 2,
    consentPartage: false,
    signatureNom: "",
    signatureDate: "",
    draft: true,
    docs: emptyDraftDocs(),
    accesses: [],
  };
}

/**
 * Map FamilyProfile UI patches onto SeniorProfile persistence fields.
 * Only includes keys present on the patch (partial updates).
 */
export function familyPatchToSenior(
  patch: Partial<FamilyProfile>,
): Partial<{
  firstName: string;
  lastName: string;
  relationship: string;
  filledBy: string;
  photoDataUrl: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  budgetMax: string;
  searchZones: { id: string; query: string; radiusMiles: number }[];
}> {
  const out: ReturnType<typeof familyPatchToSenior> = {};
  if (patch.prenom !== undefined) out.firstName = patch.prenom;
  if (patch.nom !== undefined) out.lastName = patch.nom;
  if (patch.rel !== undefined) out.relationship = patch.rel;
  if (patch.profileSubject !== undefined) {
    out.filledBy =
      patch.profileSubject === "self"
        ? "Pour moi-même"
        : patch.profileSubject === "proche"
          ? "Pour un proche"
          : "";
    if (patch.profileSubject === "self") out.relationship = patch.rel || "Moi-même";
  }
  if (patch.photo !== undefined) out.photoDataUrl = patch.photo || "";
  if (patch.dateNaissance !== undefined) out.dateOfBirth = patch.dateNaissance;
  if (patch.sexe !== undefined) out.gender = patch.sexe;
  if (patch.adresse !== undefined) out.address = patch.adresse;
  if (patch.ville !== undefined) out.city = patch.ville;
  if (patch.province !== undefined) out.state = patch.province;
  if (patch.codePostal !== undefined) out.zip = patch.codePostal;
  if (patch.searchBudgetMax !== undefined) {
    out.budgetMax =
      patch.searchBudgetMax != null && patch.searchBudgetMax > 0
        ? String(patch.searchBudgetMax)
        : "";
  }
  if (patch.searchSector !== undefined || patch.searchRadiusKm !== undefined) {
    const km = patch.searchRadiusKm;
    out.searchZones = [
      {
        id: "z1",
        query: patch.searchSector ?? "",
        radiusMiles: km != null && km > 0 ? Math.round(km / 1.609) : 25,
      },
    ];
  }
  return out;
}

export function profileDisplayName(p: FamilyProfile) {
  const full = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
  return full || "Nouveau dossier";
}

/** Whether this dossier is for the logged-in person. */
export function isFamilyProfileSelf(
  p: Pick<FamilyProfile, "profileSubject" | "rel">,
): boolean {
  if (p.profileSubject === "self") return true;
  if (p.profileSubject === "proche") return false;
  const r = (p.rel || "").toLowerCase();
  return r.includes("moi-même") || r.includes("moi-meme") || r.includes("myself");
}

/** Short FR label for UI copy (vous / votre proche / prénom). */
export function dossierSubjectLabel(p: FamilyProfile): string {
  if (isFamilyProfileSelf(p)) return "vous";
  const name = profileDisplayName(p);
  return name !== "Nouveau dossier" ? name : "votre proche";
}

export const PROCHE_RELATIONSHIP_OPTIONS = [
  "Parent",
  "Beau-parent",
  "Conjoint / conjointe",
  "Enfant",
  "Frère / sœur",
  "Petit-enfant",
  "Ami(e)",
  "Aidant professionnel",
  "Autre",
] as const;

/** Active RPA Québec registry catalog for family browse. */
export { RESIDENCES, RPA_REGIONS, RPA_SOURCE } from "@/data/rpa-quebec";

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
  "Pour qui",
  "Identité",
  "Contacts",
  "Statut légal",
  "Assurances",
  "Finances",
  "Soins",
  "Recherche",
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
  forSelf?: boolean;
}): FamilyNextStep[] {
  const owner = (input.ownerLabel || "").trim() || "Vous";
  const steps: FamilyNextStep[] = [];

  if (!input.hasSeniorProfile) {
    steps.push({
      label: input.forSelf
        ? "Créer votre dossier d'admission"
        : "Créer le dossier de votre proche",
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

export const UNIT_TYPES = ["Logement", "Chambre simple", "Chambre double"] as const;
export const SERVICES = [
  "Repas",
  "Soins infirmiers",
  "Aide au bain",
  "Aide à la mobilité",
  "Loisirs",
  "Entretien ménager",
] as const;

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
