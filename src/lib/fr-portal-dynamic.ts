/**
 * Adapters: French family space + residence console ↔ persistent stores.
 * localStorage via useFamilyData / useCommunityPortal / admissions-bridge.
 */

import type { ApplicationStatus } from "@/data/applications";
import { normalizeApplicationStatus } from "@/data/applications";
import { getResidence } from "@/data/residences";
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

  let update = "Application received by the residence.";
  let updateTone: UiApp["updateTone"] = "green";
  if (status === "waitlisted") {
    update = app.waitingPosition
      ? `Placed on the waitlist — rank ${app.waitingPosition}.`
      : "Placed on the waitlist — rank shared by the residence.";
    updateTone = "neutral";
  } else if (status === "tour_requested" || app.upcomingAppointment) {
    update = app.upcomingAppointment
      ? `Visit scheduled: ${app.upcomingAppointment}.`
      : "Visit proposed by the residence.";
  } else if (status === "under_review" || status === "more_info") {
    update =
      app.requestedDocuments?.length > 0
        ? `Documents requested: ${app.requestedDocuments.slice(0, 2).join(", ")}.`
        : "File verified. Decision expected shortly.";
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

export function buildSubmitDraft(input: {
  residenceId: string;
  residenceName: string;
  unit: string;
  userName: string;
  userEmail: string;
  documentIds: string[];
}): StoreApp | null {
  const catalogId = toCatalogResidenceId(input.residenceId);
  const residence = getResidence(catalogId);
  if (!residence) return null;

  const draft = emptyDraftApplication(residence, {
    name: input.userName,
    email: input.userEmail,
  });
  return {
    ...draft,
    residenceId: catalogId,
    residenceName: input.residenceName || residence.name,
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

/** Map FR mock residence keys to catalog ids used by the community portal. */
export const FR_RESIDENCE_CATALOG: Record<string, string> = {
  jardins: "maple-grove",
  manoir: "lakeside-haven",
  villa: "cedar-memory",
  "maple-grove": "maple-grove",
  "lakeside-haven": "lakeside-haven",
  "cedar-memory": "cedar-memory",
};

export function toCatalogResidenceId(id: string) {
  return FR_RESIDENCE_CATALOG[id] || id;
}
