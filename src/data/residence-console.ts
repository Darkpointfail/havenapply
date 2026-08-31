/** Mock data for the HavenApply residence admissions console (Québec). */

export type DemandeStatus =
  | "Nouvelle"
  | "En évaluation"
  | "Documents manquants"
  | "Visite planifiée"
  | "Acceptée"
  | "Liste d'attente";

export type UrgenceLevel = "Urgente" | "Élevée" | "Standard";

export type Demande = {
  id: string;
  /** Human-facing HA-A-… when available */
  publicRef?: string | null;
  nom: string;
  age: number;
  unite: string;
  statut: DemandeStatus;
  piecesManquantes: number;
  recueLe: string;
  dateNaissance: string;
  adresse: string;
  autonomie: string;
  services: string;
  budget: string;
  provenance: string;
  contact: string;
  contactLien: string;
  emmenagement: string;
  resumeIa: string;
  noteInterne?: string;
};

export type WaitlistEntry = {
  id: string;
  nom: string;
  age: number;
  unite: string;
  joursAttente: number;
  urgence: UrgenceLevel;
  dossierComplet: boolean;
};

export const REQUIRED_DOCS = [
  "Pièce d'identité",
  "Carte d'assurance maladie",
  "Bilan médical",
  "Liste de médicaments",
  "Preuve de revenus",
  "Mandat de protection",
] as const;

export const RESIDENCE = {
  name: "Résidence Les Jardins de Sainte-Foy",
  city: "Sainte-Foy, Québec",
  units: 112,
  type: "Résidence privée pour aînés",
  description:
    "Établissement chaleureux au cœur de Sainte-Foy, offrant des unités adaptées, des soins personnalisés et une vie communautaire enrichissante pour les aînés en quête de sécurité et de confort.",
  staff: {
    name: "Claudine Mercier",
    role: "Directrice adjointe",
    initials: "CM",
  },
};

export const DEMANDES: Demande[] = [
  {
    id: "d1",
    nom: "Marguerite Lévesque",
    age: 84,
    unite: "3½ avec services",
    statut: "Documents manquants",
    piecesManquantes: 2,
    recueLe: "26 août 2026",
    dateNaissance: "12 mars 1942",
    adresse: "1840 rue des Érables, Québec",
    autonomie: "Semi-autonome",
    services: "Aide à la toilette, médicaments",
    budget: "3 200 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Sophie Lévesque",
    contactLien: "fille",
    emmenagement: "Octobre 2026",
    resumeIa:
      "Dossier avancé : 4 pièces reçues sur 6. Manquent la preuve de revenus et le mandat de protection. Profil adapté au 3½ avec services. Une relance a déjà été envoyée le 27 août.",
    noteInterne:
      "Famille très engagée. Prévoir visite dès réception des pièces manquantes.\nAjoutée par C. Mercier · 25 août",
  },
  {
    id: "d2",
    nom: "Roland Bouchard",
    age: 79,
    unite: "2½",
    statut: "Visite planifiée",
    piecesManquantes: 0,
    recueLe: "22 août 2026",
    dateNaissance: "3 juillet 1947",
    adresse: "920 boul. Laurier, Québec",
    autonomie: "Autonome",
    services: "Repas du soir",
    budget: "2 600 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Michel Bouchard",
    contactLien: "fils",
    emmenagement: "Septembre 2026",
    resumeIa:
      "Dossier complet. Visite planifiée le 2 septembre à 10 h 30. Profil autonome, unité 2½ disponible.",
  },
  {
    id: "d3",
    nom: "Jeanne D'Arc Trudel",
    age: 91,
    unite: "3½ avec soins",
    statut: "En évaluation",
    piecesManquantes: 0,
    recueLe: "20 août 2026",
    dateNaissance: "18 janvier 1935",
    adresse: "CLSC Sainte-Foy · transition",
    autonomie: "Besoin de soins",
    services: "Soins infirmiers, aide complète",
    budget: "4 100 $ / mois",
    provenance: "Référence du CLSC",
    contact: "Nathalie Trudel",
    contactLien: "fille",
    emmenagement: "Dès que possible",
    resumeIa:
      "Référence CLSC. Dossier complet. Profil soins élevés — vérifier disponibilité 3½ avec soins avant décision.",
  },
  {
    id: "d4",
    nom: "Armand Pelletier",
    age: 87,
    unite: "1½",
    statut: "Documents manquants",
    piecesManquantes: 4,
    recueLe: "19 août 2026",
    dateNaissance: "9 novembre 1938",
    adresse: "55 av. Maguire, Québec",
    autonomie: "Autonome",
    services: "Aucun pour l'instant",
    budget: "2 100 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Luc Pelletier",
    contactLien: "fils",
    emmenagement: "Flexible",
    resumeIa:
      "Dossier incomplet : 4 pièces manquantes. Trois relances envoyées. Risque de stagnation sans nouvelle action.",
  },
  {
    id: "d5",
    nom: "Yvette Grondin",
    age: 82,
    unite: "3½ avec services",
    statut: "Acceptée",
    piecesManquantes: 0,
    recueLe: "14 août 2026",
    dateNaissance: "22 mai 1944",
    adresse: "210 chemin Sainte-Foy, Québec",
    autonomie: "Semi-autonome",
    services: "Médicaments, repas",
    budget: "3 400 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Anne Grondin",
    contactLien: "fille",
    emmenagement: "Septembre 2026",
    resumeIa: "Demande acceptée. Dossier complet. Prête pour intégration en liste d'attente ou transition.",
  },
  {
    id: "d6",
    nom: "Gérard Ouellet",
    age: 88,
    unite: "2½ avec services",
    statut: "Liste d'attente",
    piecesManquantes: 0,
    recueLe: "8 août 2026",
    dateNaissance: "30 septembre 1937",
    adresse: "440 rue Saint-Jean, Québec",
    autonomie: "Semi-autonome",
    services: "Aide légère, repas",
    budget: "2 900 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Marie Ouellet",
    contactLien: "fille",
    emmenagement: "Dès disponibilité",
    resumeIa: "Déjà en liste d'attente. Dossier complet. Urgence élevée.",
  },
  {
    id: "d7",
    nom: "Thérèse Fournier",
    age: 85,
    unite: "3½",
    statut: "En évaluation",
    piecesManquantes: 0,
    recueLe: "16 août 2026",
    dateNaissance: "4 avril 1941",
    adresse: "78 rue Cartier, Québec",
    autonomie: "Semi-autonome",
    services: "Repas, activités",
    budget: "3 000 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Pierre Fournier",
    contactLien: "fils",
    emmenagement: "Novembre 2026",
    resumeIa: "Dossier complet en évaluation clinique. Aucune pièce manquante.",
  },
  {
    id: "d8",
    nom: "Paul-Émile Simard",
    age: 90,
    unite: "3½ avec services",
    statut: "Nouvelle",
    piecesManquantes: 1,
    recueLe: "27 août 2026",
    dateNaissance: "15 décembre 1935",
    adresse: "12 rue de la Colline, Québec",
    autonomie: "Semi-autonome",
    services: "Médicaments, aide matinale",
    budget: "3 500 $ / mois",
    provenance: "Famille — demande en ligne",
    contact: "Hélène Simard",
    contactLien: "fille",
    emmenagement: "Dès que possible",
    resumeIa:
      "Nouvelle demande reçue le 27 août. Une pièce manquante (mandat de protection). Prioriser l'ouverture du dossier.",
  },
];

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: "w1",
    nom: "Gérard Ouellet",
    age: 88,
    unite: "2½ avec services",
    joursAttente: 17,
    urgence: "Élevée",
    dossierComplet: true,
  },
  {
    id: "w2",
    nom: "Armand Pelletier",
    age: 87,
    unite: "1½",
    joursAttente: 9,
    urgence: "Standard",
    dossierComplet: false,
  },
  {
    id: "w3",
    nom: "Thérèse Fournier",
    age: 85,
    unite: "3½",
    joursAttente: 19,
    urgence: "Standard",
    dossierComplet: true,
  },
  {
    id: "w4",
    nom: "Lucienne Gagné",
    age: 86,
    unite: "3½ avec services",
    joursAttente: 26,
    urgence: "Urgente",
    dossierComplet: true,
  },
  {
    id: "w5",
    nom: "Fernand Côté",
    age: 83,
    unite: "3½ avec services",
    joursAttente: 34,
    urgence: "Élevée",
    dossierComplet: true,
  },
  {
    id: "w6",
    nom: "Simone Bergeron",
    age: 81,
    unite: "1½",
    joursAttente: 41,
    urgence: "Standard",
    dossierComplet: false,
  },
];

export const STATUS_STYLES: Record<DemandeStatus, { bg: string; color: string }> = {
  Nouvelle: { bg: "#E2F3EF", color: "#101815" },
  "En évaluation": { bg: "#ECF3F0", color: "#0A6F63" },
  "Documents manquants": { bg: "#FBEEE4", color: "#A6572B" },
  "Visite planifiée": { bg: "#E2F3EF", color: "#0E9384" },
  Acceptée: { bg: "#E2F3EF", color: "#0E9384" },
  "Liste d'attente": { bg: "#F3F7F5", color: "#586863" },
};

export const URGENCE_ORDER: Record<UrgenceLevel, number> = {
  Urgente: 0,
  Élevée: 1,
  Standard: 2,
};

export function sortWaitlist(list: WaitlistEntry[]): WaitlistEntry[] {
  return [...list].sort((a, b) => {
    const u = URGENCE_ORDER[a.urgence] - URGENCE_ORDER[b.urgence];
    if (u !== 0) return u;
    return b.joursAttente - a.joursAttente;
  });
}

/** Last n required docs are pending based on piecesManquantes. */
export function docsForDemande(piecesManquantes: number) {
  const total = REQUIRED_DOCS.length;
  const pendingStart = total - piecesManquantes;
  return REQUIRED_DOCS.map((name, i) => ({
    name,
    received: i < pendingStart,
  }));
}

export const WEEKLY_DEMANDES = [9, 11, 8, 14, 12, 10, 13, 15, 11, 16, 12, 11];

export const DASHBOARD_FUNNEL = [
  { label: "Reçues", value: 142, pct: 100, color: "#101815" },
  { label: "Dossiers complétés", value: 96, pct: 68, color: "#0E9384" },
  { label: "Visites réalisées", value: 61, pct: 43, color: "#0A6F63" },
  { label: "Admissions confirmées", value: 34, pct: 24, color: "#A6572B" },
];

export const UNIT_AVAILABILITY = [
  { type: "1½", free: "2 libres", waiting: "3 en attente", alert: false },
  { type: "2½", free: "1 libre", waiting: "4 en attente", alert: false },
  { type: "3½ avec services", free: "complet", waiting: "5 en attente", alert: true },
  { type: "3½ avec soins", free: "1 libre en octobre", waiting: "2 en attente", alert: false },
];

export const UNIT_PRICING = [
  { type: "1½", area: "320 pi²", price: "2 150 $", avail: "2 libres" },
  { type: "2½", area: "480 pi²", price: "2 650 $", avail: "1 libre" },
  { type: "3½ avec services", area: "620 pi²", price: "3 350 $", avail: "Complet" },
  { type: "3½ avec soins", area: "640 pi²", price: "4 050 $", avail: "1 en oct." },
];

export const SERVICES_INCLUS = [
  "Repas quotidiens",
  "Entretien ménager",
  "Activités sociales",
  "Infirmerie 24 h",
  "Transport médical",
  "Salon de coiffure",
];

export type VisitSlot = {
  day: number;
  time: string;
  name: string;
  unit: string;
  kind: "visite" | "suivi";
};

export const VISITS: VisitSlot[] = [
  { day: 0, time: "9 h 30", name: "Roland Bouchard", unit: "2½", kind: "visite" },
  { day: 0, time: "14 h 00", name: "Famille Lévesque", unit: "Suivi", kind: "suivi" },
  { day: 1, time: "10 h 30", name: "Jeanne D'Arc Trudel", unit: "3½ soins", kind: "visite" },
  { day: 2, time: "11 h 00", name: "Thérèse Fournier", unit: "3½", kind: "visite" },
  { day: 2, time: "15 h 30", name: "Armand Pelletier", unit: "Suivi", kind: "suivi" },
  { day: 3, time: "9 h 00", name: "Paul-Émile Simard", unit: "3½ services", kind: "visite" },
];

export const PROGRESS_STEPS = [
  "Demande reçue",
  "Dossier ouvert et vérifié",
  "Visite de la résidence",
  "Décision d'admission",
  "Export du dossier et intégration",
] as const;

export function progressIndexForStatus(status: DemandeStatus): number {
  switch (status) {
    case "Nouvelle":
      return 0;
    case "Documents manquants":
    case "En évaluation":
      return 1;
    case "Visite planifiée":
      return 2;
    case "Acceptée":
    case "Liste d'attente":
      return 3;
    default:
      return 0;
  }
}
