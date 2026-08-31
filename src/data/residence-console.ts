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
  "Proof of identity",
  "Health insurance card",
  "Medical assessment",
  "Medication list",
  "Proof of income",
  "Protection mandate",
] as const;

export const RESIDENCE = {
  name: "Résidence Les Jardins de Sainte-Foy",
  city: "Sainte-Foy, Québec",
  units: 112,
  type: "Private residence for seniors",
  description:
    "A welcoming facility in the heart of Sainte-Foy, offering adapted units, personalized care, and an enriching community life for seniors seeking safety and comfort.",
  staff: {
    name: "Claudine Mercier",
    role: "Assistant director",
    initials: "CM",
  },
};

export const DEMANDES: Demande[] = [
  {
    id: "d1",
    nom: "Marguerite Lévesque",
    age: 84,
    unite: "3½ with services",
    statut: "Documents manquants",
    piecesManquantes: 2,
    recueLe: "August 26, 2026",
    dateNaissance: "March 12, 1942",
    adresse: "1840 rue des Érables, Québec",
    autonomie: "Semi-autonomous",
    services: "Toileting assistance, medication",
    budget: "3 200 $/month",
    provenance: "Family — online application",
    contact: "Sophie Lévesque",
    contactLien: "fille",
    emmenagement: "Octobre 2026",
    resumeIa:
      "Advanced file: 4 of 6 documents received. Missing proof of income and protection mandate. Profile fits 3½ with services. A follow-up was already sent on August 27.",
    noteInterne:
      "Very engaged family. Schedule a visit once missing documents arrive.\nAdded by C. Mercier · August 25",
  },
  {
    id: "d2",
    nom: "Roland Bouchard",
    age: 79,
    unite: "2½",
    statut: "Visite planifiée",
    piecesManquantes: 0,
    recueLe: "August 22, 2026",
    dateNaissance: "July 3, 1947",
    adresse: "920 boul. Laurier, Québec",
    autonomie: "Autonomous",
    services: "Evening meals",
    budget: "2 600 $/month",
    provenance: "Family — online application",
    contact: "Michel Bouchard",
    contactLien: "fils",
    emmenagement: "Septembre 2026",
    resumeIa:
      "Complete file. Visit scheduled for September 2 at 10:30 a.m. Autonomous profile, 2½ unit available.",
  },
  {
    id: "d3",
    nom: "Jeanne D'Arc Trudel",
    age: 91,
    unite: "3½ with care",
    statut: "En évaluation",
    piecesManquantes: 0,
    recueLe: "August 20, 2026",
    dateNaissance: "January 18, 1935",
    adresse: "CLSC Sainte-Foy · transition",
    autonomie: "Needs care",
    services: "Nursing care, full assistance",
    budget: "4 100 $/month",
    provenance: "CLSC referral",
    contact: "Nathalie Trudel",
    contactLien: "fille",
    emmenagement: "As soon as possible",
    resumeIa:
      "CLSC referral. Complete file. High-care profile — confirm 3½ with care availability before deciding.",
  },
  {
    id: "d4",
    nom: "Armand Pelletier",
    age: 87,
    unite: "1½",
    statut: "Documents manquants",
    piecesManquantes: 4,
    recueLe: "August 19, 2026",
    dateNaissance: "November 9, 1938",
    adresse: "55 av. Maguire, Québec",
    autonomie: "Autonomous",
    services: "None for now",
    budget: "2 100 $/month",
    provenance: "Family — online application",
    contact: "Luc Pelletier",
    contactLien: "fils",
    emmenagement: "Flexible",
    resumeIa:
      "Incomplete file: 4 missing documents. Three follow-ups sent. Risk of stalling without further action.",
  },
  {
    id: "d5",
    nom: "Yvette Grondin",
    age: 82,
    unite: "3½ with services",
    statut: "Acceptée",
    piecesManquantes: 0,
    recueLe: "August 14, 2026",
    dateNaissance: "May 22, 1944",
    adresse: "210 chemin Sainte-Foy, Québec",
    autonomie: "Semi-autonomous",
    services: "Medication, meals",
    budget: "3 400 $/month",
    provenance: "Family — online application",
    contact: "Anne Grondin",
    contactLien: "fille",
    emmenagement: "Septembre 2026",
    resumeIa: "Application accepted. Complete file. Ready for waitlist placement or transition.",
  },
  {
    id: "d6",
    nom: "Gérard Ouellet",
    age: 88,
    unite: "2½ with services",
    statut: "Liste d'attente",
    piecesManquantes: 0,
    recueLe: "August 8, 2026",
    dateNaissance: "September 30, 1937",
    adresse: "440 rue Saint-Jean, Québec",
    autonomie: "Semi-autonomous",
    services: "Light assistance, meals",
    budget: "2 900 $/month",
    provenance: "Family — online application",
    contact: "Marie Ouellet",
    contactLien: "fille",
    emmenagement: "When available",
    resumeIa: "Already on the waitlist. Complete file. High urgency.",
  },
  {
    id: "d7",
    nom: "Thérèse Fournier",
    age: 85,
    unite: "3½",
    statut: "En évaluation",
    piecesManquantes: 0,
    recueLe: "August 16, 2026",
    dateNaissance: "April 4, 1941",
    adresse: "78 rue Cartier, Québec",
    autonomie: "Semi-autonomous",
    services: "Meals, activities",
    budget: "3 000 $/month",
    provenance: "Family — online application",
    contact: "Pierre Fournier",
    contactLien: "fils",
    emmenagement: "November 2026",
    resumeIa: "Complete file under clinical review. No missing documents.",
  },
  {
    id: "d8",
    nom: "Paul-Émile Simard",
    age: 90,
    unite: "3½ with services",
    statut: "Nouvelle",
    piecesManquantes: 1,
    recueLe: "August 27, 2026",
    dateNaissance: "December 15, 1935",
    adresse: "12 rue de la Colline, Québec",
    autonomie: "Semi-autonomous",
    services: "Medication, morning assistance",
    budget: "3 500 $/month",
    provenance: "Family — online application",
    contact: "Hélène Simard",
    contactLien: "fille",
    emmenagement: "As soon as possible",
    resumeIa:
      "New application received on August 27. One missing document (protection mandate). Prioritize opening the file.",
  },
];

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: "w1",
    nom: "Gérard Ouellet",
    age: 88,
    unite: "2½ with services",
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
    unite: "3½ with services",
    joursAttente: 26,
    urgence: "Urgente",
    dossierComplet: true,
  },
  {
    id: "w5",
    nom: "Fernand Côté",
    age: 83,
    unite: "3½ with services",
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
  { label: "Received", value: 142, pct: 100, color: "#101815" },
  { label: "Files completed", value: 96, pct: 68, color: "#0E9384" },
  { label: "Visits completed", value: 61, pct: 43, color: "#0A6F63" },
  { label: "Admissions confirmed", value: 34, pct: 24, color: "#A6572B" },
];

export const UNIT_AVAILABILITY = [
  { type: "1½", free: "2 available", waiting: "3 waiting", alert: false },
  { type: "2½", free: "1 available", waiting: "4 waiting", alert: false },
  { type: "3½ with services", free: "full", waiting: "5 waiting", alert: true },
  { type: "3½ with care", free: "1 available in October", waiting: "2 waiting", alert: false },
];

export const UNIT_PRICING = [
  { type: "1½", area: "320 sq ft", price: "$2,150", avail: "2 available" },
  { type: "2½", area: "480 sq ft", price: "$2,650", avail: "1 available" },
  { type: "3½ with services", area: "620 sq ft", price: "$3,350", avail: "Full" },
  { type: "3½ with care", area: "640 sq ft", price: "$4,050", avail: "1 in Oct." },
];

export const SERVICES_INCLUS = [
  "Daily meals",
  "Housekeeping",
  "Social activities",
  "24h nursing station",
  "Medical transport",
  "Hair salon",
];

export type VisitSlot = {
  day: number;
  /** 24-hour "HH:MM"; formatted locale-aware for display. */
  time: string;
  name: string;
  unit: string;
  kind: "visite" | "suivi";
};

export const VISITS: VisitSlot[] = [
  { day: 0, time: "09:30", name: "Roland Bouchard", unit: "2½", kind: "visite" },
  { day: 0, time: "14:00", name: "Famille Lévesque", unit: "", kind: "suivi" },
  { day: 1, time: "10:30", name: "Jeanne D'Arc Trudel", unit: "3½ soins", kind: "visite" },
  { day: 2, time: "11:00", name: "Thérèse Fournier", unit: "3½", kind: "visite" },
  { day: 2, time: "15:30", name: "Armand Pelletier", unit: "", kind: "suivi" },
  { day: 3, time: "09:00", name: "Paul-Émile Simard", unit: "3½ services", kind: "visite" },
];

export const PROGRESS_STEPS = [
  "Application received",
  "File opened and verified",
  "Residence visit",
  "Admission decision",
  "File export and integration",
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
