import type { Application, ApplicationStatus, TimelineEvent } from "@/data/applications";
import {
  nextActionForStatus,
  normalizeApplicationStatus,
} from "@/data/applications";
import type { Residence } from "@/data/residences";
import { buildCommunityDetail } from "@/lib/residence-detail";
import type { DocCategoryId } from "@/lib/document-vault";

export type ApplicationQuestion = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "textarea" | "select";
  options?: string[];
};

export type FamilyApplication = {
  id: string;
  residenceId: string;
  residenceName: string;
  image: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  submittedDateLabel: string | null;
  attachedDocumentIds: string[];
  specificAnswers: Record<string, string>;
  desiredMoveIn: string;
  consentShare: boolean;
  consentAccurate: boolean;
  signatureName: string;
  submittedByName: string;
  submittedByEmail: string;
  familyAccess: string[];
  confirmationSent: boolean;
  communityNotified: boolean;
  waitingPosition: number | null;
  estimatedAdmission: string | null;
  requestedDocuments: string[];
  unreadMessages: number;
  timeline: TimelineEvent[];
  draftStep: number;
  /** Links apps sent in one multi-apply session — each app remains independent */
  batchId: string | null;
  /**
   * Private community response for THIS application only.
   * Never shared with or visible to other communities.
   */
  communityDecision: CommunityDecision | null;
  contactName: string;
  contactRole: string;
  upcomingAppointment: string | null;
  lastUpdatedLabel: string;
};

/** Actions a community may take — visible only on that application's thread */
export type CommunityDecisionKind =
  | "pending"
  | "accepted"
  | "rejected"
  | "info_requested"
  | "waitlist"
  | "tour_offered"
  | "assessment_offered"
  | "placement_offered";

export type CommunityDecision = {
  kind: CommunityDecisionKind;
  note: string;
  updatedAt: string;
};

export const COMMUNITY_DECISION_LABELS: Record<CommunityDecisionKind, string> = {
  pending: "Awaiting community response",
  accepted: "Accepted",
  rejected: "Declined",
  info_requested: "Information requested",
  waitlist: "Placed on waitlist",
  tour_offered: "Tour proposed",
  assessment_offered: "Assessment proposed",
  placement_offered: "Placement offered",
};

export const APPLY_STEPS = [
  { id: "profile", title: "Profile check", short: "Profile" },
  { id: "requirements", title: "Community requirements", short: "Requirements" },
  { id: "documents", title: "Documents", short: "Documents" },
  { id: "questions", title: "Specific questions", short: "Questions" },
  { id: "authorizations", title: "Authorizations", short: "Consent" },
  { id: "summary", title: "Summary", short: "Summary" },
  { id: "sent", title: "Submitted", short: "Sent" },
] as const;

export type ApplyStepId = (typeof APPLY_STEPS)[number]["id"];

/** Required doc categories commonly requested at apply time */
export const APPLY_REQUIRED_DOCS: { category: DocCategoryId; label: string }[] = [
  { category: "identification", label: "Photo ID / identification" },
  { category: "insurance_card", label: "Insurance card" },
  { category: "physician_report", label: "Physician report / H&P" },
  { category: "medication_list", label: "Current medication list" },
  { category: "power_of_attorney", label: "Power of attorney (if applicable)" },
];

export const EXTRA_FORMS: Record<string, string[]> = {
  default: ["Community residency questionnaire", "Financial disclosure summary"],
  "cedar-memory": [
    "Memory care behavioral history form",
    "Wandering / elopement risk checklist",
  ],
  "riverside-nursing": ["Skilled nursing clinical packet", "Advance directives checklist"],
};

export function communityQuestions(residenceId: string): ApplicationQuestion[] {
  const base: ApplicationQuestion[] = [
    {
      id: "reason",
      label: "Why are you applying to this community?",
      type: "textarea",
      required: true,
      placeholder: "Share what matters most for your loved one…",
    },
    {
      id: "move_timing",
      label: "How firm is your preferred move-in date?",
      type: "select",
      required: true,
      options: ["Flexible", "Preferred window", "Urgent / ASAP"],
    },
    {
      id: "payer",
      label: "Who will be the primary financial contact?",
      type: "text",
      required: true,
      placeholder: "Name and relationship",
    },
  ];

  if (residenceId === "cedar-memory") {
    base.push({
      id: "wandering",
      label: "Any history of wandering or exit-seeking?",
      type: "select",
      options: ["No", "Yes — occasional", "Yes — frequent", "Unsure"],
      required: true,
    });
  }
  if (residenceId === "lakeside-haven") {
    base.push({
      id: "rehab",
      label: "Is post-hospital rehabilitation a priority?",
      type: "select",
      options: ["Yes", "No", "Possibly"],
    });
  }
  if (residenceId === "riverside-nursing") {
    base.push({
      id: "clinical",
      label: "List any skilled nursing needs (wound care, IV, oxygen…)",
      type: "textarea",
      placeholder: "Optional clinical context for admissions nursing",
    });
  }
  return base;
}

export function applicationFeesNote(residence: Residence): string {
  if (!residence.priceAvailable || residence.priceFrom == null) {
    return "Application fee and community fees confirmed after inquiry (public pricing unavailable).";
  }
  const deposit = Math.round(residence.priceFrom * 0.5);
  return `Typical community deposit ~$${deposit.toLocaleString()} after acceptance. No Haven platform fee for families. Confirm any application fee directly with admissions.`;
}

export function emptyDraftApplication(
  residence: Residence,
  meta: { name: string; email: string },
  opts?: { batchId?: string },
): FamilyApplication {
  return {
    id: `app-${residence.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    residenceId: residence.id,
    residenceName: residence.name,
    image: residence.image,
    status: "draft",
    submittedAt: null,
    submittedDateLabel: null,
    attachedDocumentIds: [],
    specificAnswers: {},
    desiredMoveIn: "",
    consentShare: false,
    consentAccurate: false,
    signatureName: "",
    submittedByName: meta.name,
    submittedByEmail: meta.email,
    familyAccess: [meta.name || "Primary family account"].filter(Boolean),
    confirmationSent: false,
    communityNotified: false,
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: [],
    unreadMessages: 0,
    timeline: [
      {
        id: `ev-${Date.now()}`,
        type: "created",
        label: "Application created",
        date: formatTimelineDate(),
        done: true,
      },
    ],
    draftStep: 0,
    batchId: opts?.batchId ?? null,
    communityDecision: null,
    contactName: "Admissions team",
    contactRole: "Pending assignment",
    upcomingAppointment: null,
    lastUpdatedLabel: formatShortDate(),
  };
}

export function formatShortDate(d = new Date()) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimelineDate(d = new Date()) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function hasActiveSubmission(
  apps: FamilyApplication[],
  residenceId: string,
): FamilyApplication | undefined {
  return apps.find((a) => {
    const s = normalizeApplicationStatus(a.status);
    return (
      a.residenceId === residenceId &&
      s !== "draft" &&
      s !== "ready" &&
      s !== "declined" &&
      s !== "withdrawn" &&
      s !== "closed"
    );
  });
}

export function toDisplayApplication(app: FamilyApplication): Application {
  const status = normalizeApplicationStatus(app.status);
  const missing = app.requestedDocuments.length
    ? app.requestedDocuments
    : [];
  return {
    id: app.id,
    residenceId: app.residenceId,
    residenceName: app.residenceName,
    image: app.image,
    status,
    submittedDate: app.submittedDateLabel,
    lastUpdated: app.lastUpdatedLabel || app.submittedDateLabel || "—",
    waitingPosition: app.waitingPosition,
    estimatedAdmission: app.estimatedAdmission,
    requestedDocuments: app.requestedDocuments,
    missingDocuments: missing,
    nextAction: nextActionForStatus(status, missing),
    contactName: app.contactName || "Admissions",
    contactRole: app.contactRole || "Community",
    upcomingAppointment: app.upcomingAppointment,
    unreadMessages: app.unreadMessages,
    timeline: (app.timeline || []).map((t, i) =>
      "type" in t && t.type
        ? (t as TimelineEvent)
        : {
            id: `legacy-${app.id}-${i}`,
            type: "status" as const,
            label: t.label,
            date: t.date,
            done: t.done,
          },
    ),
  };
}

export function submitFamilyApplication(draft: FamilyApplication): FamilyApplication {
  const now = new Date();
  return {
    ...draft,
    status: "submitted",
    submittedAt: now.toISOString(),
    submittedDateLabel: formatShortDate(now),
    lastUpdatedLabel: formatShortDate(now),
    confirmationSent: true,
    communityNotified: true,
    draftStep: APPLY_STEPS.length - 1,
    contactName: draft.contactName || "Admissions team",
    contactRole: draft.contactRole || "Admissions",
    communityDecision: draft.communityDecision ?? {
      kind: "pending",
      note: "Your application was received. Other communities cannot see this status.",
      updatedAt: now.toISOString(),
    },
    timeline: [
      ...draft.timeline,
      {
        id: `sent-${now.getTime()}`,
        type: "sent",
        label: "Submitted",
        date: formatTimelineDate(now),
        done: true,
      },
      {
        id: `recv-${now.getTime()}`,
        type: "received",
        label: "Received by community",
        date: formatTimelineDate(now),
        done: true,
        detail: "Confirmation recorded · community notified",
      },
    ],
  };
}

export function applyCommunityDecision(
  app: FamilyApplication,
  kind: CommunityDecisionKind,
  note: string,
): FamilyApplication {
  const now = new Date();
  const statusMap: Partial<Record<CommunityDecisionKind, ApplicationStatus>> = {
    accepted: "approved",
    rejected: "declined",
    info_requested: "more_info",
    waitlist: "waitlisted",
    tour_offered: "tour_requested",
    assessment_offered: "assessment_requested",
    placement_offered: "offer_received",
    pending: "received",
  };
  const label = COMMUNITY_DECISION_LABELS[kind];
  const status = statusMap[kind] || normalizeApplicationStatus(app.status);
  return {
    ...app,
    status,
    lastUpdatedLabel: formatShortDate(now),
    waitingPosition: kind === "waitlist" ? app.waitingPosition ?? 5 : app.waitingPosition,
    requestedDocuments:
      kind === "info_requested"
        ? app.requestedDocuments.length
          ? app.requestedDocuments
          : ["Updated physician report"]
        : app.requestedDocuments,
    upcomingAppointment:
      kind === "tour_offered"
        ? "Tour proposed — confirm a time"
        : kind === "assessment_offered"
          ? "Assessment proposed — confirm a time"
          : app.upcomingAppointment,
    communityDecision: { kind, note, updatedAt: now.toISOString() },
    timeline: [
      ...app.timeline,
      {
        id: `dec-${now.getTime()}`,
        type: "decision",
        label,
        date: formatTimelineDate(now),
        done: true,
        detail: note,
      },
    ],
  };
}

export function withdrawApplication(app: FamilyApplication): FamilyApplication {
  const now = new Date();
  return {
    ...app,
    status: "withdrawn",
    lastUpdatedLabel: formatShortDate(now),
    upcomingAppointment: null,
    timeline: [
      ...app.timeline,
      {
        id: `wd-${now.getTime()}`,
        type: "status",
        label: "Withdrawn",
        date: formatTimelineDate(now),
        done: true,
        detail: "Family withdrew this application",
      },
    ],
  };
}

export function appendTimelineEvent(
  app: FamilyApplication,
  event: Omit<TimelineEvent, "id"> & { id?: string },
): FamilyApplication {
  const now = new Date();
  return {
    ...app,
    lastUpdatedLabel: formatShortDate(now),
    timeline: [
      ...app.timeline,
      {
        id: event.id || `ev-${now.getTime()}`,
        type: event.type,
        label: event.label,
        date: event.date || formatTimelineDate(now),
        detail: event.detail,
        done: event.done ?? true,
      },
    ],
  };
}

export function requirementGaps(
  residence: Residence,
  attachedCategories: DocCategoryId[],
  careNeedsMemory: boolean,
) {
  const detail = buildCommunityDetail(residence);
  const missingDocs = APPLY_REQUIRED_DOCS.filter(
    (d) =>
      d.category !== "power_of_attorney" && !attachedCategories.includes(d.category),
  ).map((d) => d.label);

  const incompatibilities: string[] = [];
  if (careNeedsMemory && !residence.secureMemoryCare && !residence.careLevels.includes("Memory care")) {
    incompatibilities.push(
      "Care needs suggest secure memory support this community may not emphasize.",
    );
  }
  if (!residence.partner) {
    incompatibilities.push("Non-partner listing — response times may vary on Haven.");
  }

  return {
    criteria: detail.admission.residencyCriteria,
    documents: detail.admission.documents,
    extraForms: EXTRA_FORMS[residence.id] || EXTRA_FORMS.default,
    fees: applicationFeesNote(residence),
    incompatibilities,
    missingDocs,
    notAccepted: detail.admission.notAccepted,
  };
}
