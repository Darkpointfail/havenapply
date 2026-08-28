/** Mock data for HavenApply family space (Sophie Lévesque / Marguerite). */

export type FamilyView =
  | "accueil"
  | "residences"
  | "fiche"
  | "depot"
  | "profil"
  | "dossier"
  | "demandes"
  | "assistance";

export type DocStatus = "reçu" | "en attente";

export type FamilyDoc = {
  id: string;
  name: string;
  detail: string;
  status: DocStatus;
};

export type AppStatus =
  | "Demande reçue"
  | "Dossier vérifié"
  | "Visite planifiée"
  | "Liste d'attente"
  | "Décision attendue";

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
};

export const USER = {
  firstName: "Sophie",
  fullName: "Sophie Lévesque",
  initials: "SL",
};

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
    services: [
      "Repas quotidiens",
      "Infirmerie 24 h",
      "Aide à la mobilité",
      "Activités sociales",
      "Transport médical",
    ],
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
    responseLabel: "Attente estimée 2 à 4 mois",
    area: "640 pi²",
    availability: "Complet",
    availabilityTone: "terra",
    services: [
      "Soins infirmiers",
      "Aide complète",
      "Repas adaptés",
      "Surveillance 24 h",
    ],
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
    services: [
      "Repas",
      "Entretien ménager",
      "Activités",
      "Infirmerie de jour",
    ],
  },
];

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

export const TODOS = [
  { label: "Ajouter le bilan médical", owner: "Sophie", tone: "terra" as const },
  { label: "Ajouter la preuve de revenus", owner: "Sophie", tone: "terra" as const },
  { label: "Confirmer la visite du 3 septembre", owner: "Sophie", tone: "green" as const },
  { label: "Relire le dossier transmis à Villa Sainte-Anne", owner: "Famille", tone: "neutral" as const },
];

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
