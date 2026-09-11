/**
 * Adapters: French family space + residence console ↔ persistent stores.
 * localStorage via useFamilyData / useCommunityPortal / admissions-bridge.
 */

import type { ApplicationStatus } from "@/data/applications";
import { normalizeApplicationStatus } from "@/data/applications";
import type { FamilyApplication as StoreApp } from "@/lib/family-applications";
import { emptyDraftApplication } from "@/lib/family-applications";
import type { CommunityApplication } from "@/lib/community-portal";
import type { DocCategoryId, VaultDocument } from "@/lib/document-vault";
import type { FamilyApplication as UiApp, FamilyDoc, DocStatus } from "@/data/family-space";
import type { Demande, DemandeStatus, UrgenceLevel, WaitlistEntry } from "@/data/residence-console";

/** FR checklist ↔ vault categories */
export const FR_DOC_CHECKLIST: {
  id: string;
  name: string;
  detail: string;
  category: DocCategoryId;
}[] = [
  {
    id: "id",
    name: "Pièce d'identité",
    detail: "Carte d'assurance maladie ou permis",
    category: "identification",
  },
  {
    id: "ramq",
    name: "Carte d'assurance maladie",
    detail: "Recto et verso",
    category: "insurance_card",
  },
  {
    id: "bilan",
    name: "Bilan médical",
    detail: "Médecin traitant ou CLSC",
    category: "physician_report",
  },
  {
    id: "meds",
    name: "Liste de médicaments",
    detail: "Ordonnance à jour",
    category: "medication_list",
  },
  {
    id: "revenus",
    name: "Preuve de revenus",
    detail: "Avis de cotisation ou relevé",
    category: "financial",
  },
  {
    id: "mandat",
    name: "Mandat de protection",
    detail: "Ou procuration le cas échéant",
    category: "power_of_attorney",
  },
];

export function docsFromVault(documents: VaultDocument[]): FamilyDoc[] {
  return FR_DOC_CHECKLIST.map((item) => {
    const hit = documents.find((d) => d.category === item.category);
    const status: DocStatus =
      hit && (hit.status === "uploaded" || hit.status === "verified" || hit.status === "under_review")
        ? "reçu"
        : "en attente";
    return {
      id: item.id,
      name: item.name,
      detail: item.detail,
      status,
    };
  });
}

export function docsProgressFromVault(documents: VaultDocument[]) {
  const docs = docsFromVault(documents);
  const received = docs.filter((d) => d.status === "reçu").length;
  const total = docs.length;
  return {
    received,
    total,
    percent: Math.round((received / total) * 100),
    next: docs.find((d) => d.status === "en attente")?.name ?? null,
  };
}

export function categoryForFrDocId(id: string): DocCategoryId {
  return FR_DOC_CHECKLIST.find((d) => d.id === id)?.category ?? "other";
}

const STATUS_TO_FR: Partial<Record<ApplicationStatus, UiApp["status"]>> = {
  submitted: "Demande reçue",
  received: "Demande reçue",
  under_review: "Dossier vérifié",
  more_info: "Dossier vérifié",
  assessment_requested: "Dossier vérifié",
  tour_requested: "Visite planifiée",
  waitlisted: "Liste d'attente",
  conditionally_approved: "Décision attendue",
  approved: "Décision attendue",
  offer_received: "Décision attendue",
  move_in_scheduled: "Visite planifiée",
};

function progressForStatus(status: ApplicationStatus): number {
  if (status === "submitted" || status === "received") return 0;
  if (
    status === "under_review" ||
    status === "more_info" ||
    status === "assessment_requested" ||
    status === "waitlisted"
  )
    return 1;
  if (status === "tour_requested" || status === "move_in_scheduled") return 2;
  if (
    status === "conditionally_approved" ||
    status === "approved" ||
    status === "offer_received" ||
    status === "declined"
  )
    return 3;
  return 0;
}

export function storeAppToUi(app: StoreApp): UiApp | null {
  const status = normalizeApplicationStatus(app.status);
  if (status === "draft" || status === "ready" || status === "withdrawn" || status === "closed") {
    return null;
  }
  const frStatus = STATUS_TO_FR[status] ?? "Demande reçue";
  const city = app.residenceName.includes("Lévis")
    ? "Lévis"
    : app.residenceName.includes("Charlesbourg")
      ? "Charlesbourg"
      : app.residenceName.includes("Sainte-Foy") || app.residenceName.includes("Maple")
        ? "Sainte-Foy"
        : "Québec";

  // communityDecision.note is the real text the residence wrote when
  // requesting info/documents or proposing a tour (synced from the server —
  // family-data.tsx#admissionsSyncedRef) and takes priority whenever
  // present; requestedDocuments/upcomingAppointment are older fields
  // nothing currently populates, kept only as a fallback for a
  // not-yet-synced or purely local/demo application.
  let update = "Application received by the residence.";
  let updateTone: UiApp["updateTone"] = "green";
  if (status === "waitlisted") {
    update =
      app.communityDecision?.note ||
      (app.waitingPosition
        ? `Placed on the waitlist — rank ${app.waitingPosition}.`
        : "Placed on the waitlist — rank shared by the residence.");
    updateTone = "neutral";
  } else if (status === "tour_requested" || app.upcomingAppointment) {
    update =
      app.communityDecision?.note ||
      (app.upcomingAppointment
        ? `Visit scheduled: ${app.upcomingAppointment}.`
        : "Visit proposed by the residence.");
  } else if (status === "under_review" || status === "more_info") {
    update =
      app.communityDecision?.note ||
      (app.requestedDocuments?.length > 0
        ? `Documents requested: ${app.requestedDocuments.slice(0, 2).join(", ")}.`
        : "File verified. Decision expected shortly.");
  } else if (app.communityDecision?.note) {
    update = app.communityDecision.note;
  }

  const unit =
    app.specificAnswers?.unite ||
    app.specificAnswers?.unit ||
    "Unit to confirm";

  return {
    id: app.id,
    publicRef: app.publicRef || null,
    personRef: app.personRef || null,
    dossierRef: app.dossierRef || null,
    residenceId: app.residenceId,
    residenceName: app.residenceName,
    city,
    unit,
    depositedOn:
      app.submittedDateLabel ||
      (app.submittedAt
        ? new Date(app.submittedAt).toLocaleDateString("en-CA")
        : "—"),
    status: frStatus,
    progress: progressForStatus(status),
    update,
    updateTone,
    visit:
      frStatus === "Visite planifiée" || status === "tour_requested" || app.upcomingAppointment
        ? {
            dateLabel: app.upcomingAppointment || "Date to confirm",
            timeLabel: "",
            place: app.residenceName,
          }
        : null,
  };
}

/**
 * Builds a draft from what the caller already resolved (FamilySpace.tsx
 * already holds the full residence object, whichever catalog it came from —
 * demo catalog or the real RPA-backed communities). This used to re-resolve
 * residenceId against @/data/residences (the small 7-residence demo catalog)
 * via toCatalogResidenceId()/getResidence(), which silently failed (returned
 * null) for every real RPA registry id: that lookup is gone, the id/name/
 * image the caller already has are used directly. residenceId is passed
 * through unchanged — server-side getSite() (admissions/supabase-store.ts)
 * is the one place that now resolves an "rpa-XXXX" id to its real
 * communities row, via external_ref.
 */
export function buildSubmitDraft(input: {
  residenceId: string;
  residenceName: string;
  residenceImage?: string;
  unit: string;
  userName: string;
  userEmail: string;
  documentIds: string[];
}): StoreApp | null {
  if (!input.residenceId || !input.residenceName) return null;

  const draft = emptyDraftApplication(
    {
      id: input.residenceId,
      name: input.residenceName,
      image: input.residenceImage || "/community-photos/lobby.jpg",
    },
    { name: input.userName, email: input.userEmail },
  );
  return {
    ...draft,
    residenceId: input.residenceId,
    residenceName: input.residenceName,
    desiredMoveIn: "As soon as possible",
    consentShare: true,
    consentAccurate: true,
    signatureName: input.userName,
    attachedDocumentIds: input.documentIds,
    specificAnswers: { unite: input.unit, unit: input.unit },
  };
}

/* ——— Community console adapters ——— */

const STATUS_TO_DEMANDE: Partial<Record<ApplicationStatus, DemandeStatus>> = {
  submitted: "Nouvelle",
  received: "Nouvelle",
  under_review: "En évaluation",
  more_info: "Documents manquants",
  assessment_requested: "En évaluation",
  tour_requested: "Visite planifiée",
  waitlisted: "Liste d'attente",
  conditionally_approved: "Acceptée",
  approved: "Acceptée",
  offer_received: "Acceptée",
  move_in_scheduled: "Visite planifiée",
  declined: "Liste d'attente",
};

function autonomyLevelFromText(level: string): "autonome" | "aide" | "assistance" {
  const lower = level.toLowerCase();
  if (lower.includes("autonome") && !lower.includes("aide") && !lower.includes("partiel")) return "autonome";
  if (lower.includes("assistance") || lower.includes("total") || lower.includes("aucune")) return "assistance";
  return "aide";
}

export function communityAppToDemande(app: CommunityApplication): Demande {
  const status = normalizeApplicationStatus(app.status);
  const sharedCount = app.documents?.filter((d) => d.shared).length ?? 0;
  const piecesManquantes =
    status === "more_info"
      ? Math.max(1, 6 - sharedCount)
      : Math.max(0, 6 - Math.min(6, sharedCount || (status === "submitted" ? 4 : 6)));

  return {
    id: app.id,
    publicRef: app.publicRef || null,
    nom: app.seniorName,
    age: app.seniorAge || 0,
    unite: app.careType || "Unit to confirm",
    statut: STATUS_TO_DEMANDE[status] ?? "Nouvelle",
    piecesManquantes,
    recueLe: app.submittedAt
      ? new Date(app.submittedAt).toLocaleDateString("en-CA")
      : "—",
    dateNaissance: app.dossier?.dateOfBirth || "—",
    adresse: app.dossier?.currentAddress || "—",
    autonomie: app.careNeeds?.[0] || "To assess",
    services: (app.careNeeds || []).slice(0, 3).join(", ") || "To be determined",
    budget: app.paymentMethod || "To confirm",
    provenance: app.referralSource || "Family",
    contact: app.family?.name || "—",
    contactLien: app.family?.relationship || "Loved one",
    emmenagement: app.moveInRequested || "As soon as possible",
    resumeIa: app.executiveSummary || app.summary || "File received via HavenApply.",
    noteInterne: app.internalNotes?.[0]?.body,
    contactTel: app.family?.phone,
    contactCourriel: app.family?.email,
    contactPreference: app.family?.preferredContactMethod,
    contactUrgenceNom: app.emergencyContact?.name,
    contactUrgenceLien: app.emergencyContact?.relationship,
    contactUrgenceTel: app.emergencyContact?.phone,
    contactUrgenceCourriel: app.emergencyContact?.email,
    secteursRecherches: app.dossier?.preferredLocations?.join(", "),
    referenceExterne: app.dossierRef || undefined,
    logementNonNegociable: app.dossier?.nonNegotiables?.[0],
    logementPreferences: app.dossier?.importantPreferences,
    notes: app.internalNotes?.map((n, i) => ({
      id: n.id || `note-${i}`,
      auteur: n.author || "Équipe",
      horodatage: n.at ? new Date(n.at).toLocaleString("fr-CA") : "—",
      etiquette: "Suivi" as const,
      texte: n.body,
    })),
    medicaments: app.dossier?.medications?.map((m) => ({
      nom: m.name,
      dose: m.dose,
      frequence: m.frequency,
      indication: m.indication || m.route || "—",
    })),
    allergies: app.dossier?.allergies?.length
      ? app.dossier.allergies.map((a) => a.substance).join(", ")
      : undefined,
    pharmacie: app.dossier?.pharmacy,
    autonomieTuiles: app.dossier?.adls?.map((a) => ({
      label: a.activity,
      value: a.level,
      level: autonomyLevelFromText(a.level),
    })),
    evaluationTransmise: app.dossier?.fallHistory,
  };
}

export function communityAppsToWaitlist(apps: CommunityApplication[]): WaitlistEntry[] {
  return apps
    .filter((a) => normalizeApplicationStatus(a.status) === "waitlisted")
    .map((a, i) => ({
      id: a.id,
      nom: a.seniorName,
      age: a.seniorAge || 0,
      unite: a.careType || "Unit to confirm",
      joursAttente: Math.max(
        1,
        Math.round(
          (Date.now() - new Date(a.submittedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24),
        ),
      ),
      urgence: (a.priority === "high"
        ? "Urgente"
        : a.priority === "medium"
          ? "Élevée"
          : "Standard") as UrgenceLevel,
      dossierComplet: (a.documents?.filter((d) => d.shared).length ?? 0) >= 4,
      _rank: a.waitlistPosition ?? i + 1,
    }))
    .sort((a, b) => a._rank - b._rank)
    .map(({ _rank: _, ...rest }) => rest);
}


/**
 * Weekly received-applications counts for the dashboard bar chart, computed
 * live from real submittedAt timestamps — never a hardcoded series. Returns
 * the last `weeks` week-buckets, oldest first, each paired with its ISO
 * week-start date for the axis label.
 */
export function communityAppsToWeeklySeries(
  applications: CommunityApplication[],
  weeks = 12,
): { weekStart: string; count: number }[] {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * msPerWeek;
    return { weekStart: new Date(end - msPerWeek).toISOString().slice(0, 10), count: 0 };
  });
  const earliest = now - weeks * msPerWeek;
  for (const app of applications) {
    const t = app.submittedAt ? new Date(app.submittedAt).getTime() : NaN;
    if (!Number.isFinite(t) || t < earliest || t > now) continue;
    const idx = Math.min(weeks - 1, Math.floor((t - earliest) / msPerWeek));
    if (buckets[idx]) buckets[idx].count += 1;
  }
  return buckets;
}

export type DashboardFunnelStage = {
  label: string;
  value: number;
  pct: number;
  color: string;
};

/**
 * Admissions funnel computed live from real application statuses/documents
 * — replaces the hardcoded demo funnel. Stages are cumulative-ish counts
 * (received → files completed → visit proposed → admission confirmed), same
 * shape the dashboard already renders.
 */
export function communityAppsToFunnel(applications: CommunityApplication[]): DashboardFunnelStage[] {
  const received = applications.length;
  const filesCompleted = applications.filter(
    (a) => (a.documents?.filter((d) => d.shared).length ?? 0) >= 4,
  ).length;
  const visitProposed = applications.filter(
    (a) => Boolean(a.tourProposal) || a.status === "move_in_scheduled",
  ).length;
  const confirmed = applications.filter((a) =>
    ["approved", "offer_received", "conditionally_approved", "move_in_scheduled"].includes(a.status),
  ).length;
  const pct = (n: number) => (received ? Math.round((n / received) * 100) : 0);
  return [
    { label: "Received", value: received, pct: 100, color: "#101815" },
    { label: "Files completed", value: filesCompleted, pct: pct(filesCompleted), color: "#0E9384" },
    { label: "Visits proposed", value: visitProposed, pct: pct(visitProposed), color: "#0A6F63" },
    { label: "Admissions confirmed", value: confirmed, pct: pct(confirmed), color: "#A6572B" },
  ];
}
