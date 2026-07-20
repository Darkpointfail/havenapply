import { images } from "@/data/images";

/** Full admissions lifecycle statuses (PROMPT 12) */
export type ApplicationStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "received"
  | "under_review"
  | "more_info"
  | "assessment_requested"
  | "tour_requested"
  | "waitlisted"
  | "conditionally_approved"
  | "approved"
  | "declined"
  | "offer_received"
  | "move_in_scheduled"
  | "withdrawn"
  | "closed";

/** Legacy status ids still accepted from older localStorage / demos */
const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  documents: "more_info",
  review: "under_review",
  waiting: "waitlisted",
  accepted: "approved",
  rejected: "declined",
};

export function normalizeApplicationStatus(raw: string): ApplicationStatus {
  if ((STATUS_META as { id: string }[]).some((s) => s.id === raw)) {
    return raw as ApplicationStatus;
  }
  return LEGACY_STATUS[raw] || "submitted";
}

export type TimelineEventType =
  | "created"
  | "sent"
  | "received"
  | "viewed"
  | "request"
  | "document"
  | "message"
  | "appointment"
  | "status"
  | "decision";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  label: string;
  date: string;
  detail?: string;
  done: boolean;
};

export type Application = {
  id: string;
  residenceId: string;
  residenceName: string;
  image: string;
  status: ApplicationStatus;
  submittedDate: string | null;
  lastUpdated: string;
  waitingPosition: number | null;
  estimatedAdmission: string | null;
  requestedDocuments: string[];
  missingDocuments: string[];
  nextAction: string;
  contactName: string;
  contactRole: string;
  upcomingAppointment: string | null;
  unreadMessages: number;
  timeline: TimelineEvent[];
};

export const STATUS_META: {
  id: ApplicationStatus;
  label: string;
  tint: string;
  tone: "neutral" | "accent" | "warn" | "brand" | "success" | "danger";
}[] = [
  { id: "draft", label: "Draft", tint: "bg-bg-soft text-ink-muted", tone: "neutral" },
  { id: "ready", label: "Ready to submit", tint: "bg-brand-soft text-brand-strong", tone: "brand" },
  { id: "submitted", label: "Submitted", tint: "bg-sky-soft text-sky", tone: "accent" },
  { id: "received", label: "Received", tint: "bg-sky-soft text-sky", tone: "accent" },
  { id: "under_review", label: "Under review", tint: "bg-teal-soft text-teal-deep", tone: "brand" },
  { id: "more_info", label: "More information needed", tint: "bg-amber-soft text-amber", tone: "warn" },
  {
    id: "assessment_requested",
    label: "Assessment requested",
    tint: "bg-amber-soft text-amber",
    tone: "warn",
  },
  { id: "tour_requested", label: "Tour requested", tint: "bg-accent-soft text-accent", tone: "accent" },
  { id: "waitlisted", label: "Waitlisted", tint: "bg-sky-soft text-ink", tone: "accent" },
  {
    id: "conditionally_approved",
    label: "Conditionally approved",
    tint: "bg-sage-soft text-sage",
    tone: "success",
  },
  { id: "approved", label: "Approved", tint: "bg-sage-soft text-sage", tone: "success" },
  { id: "declined", label: "Declined", tint: "bg-coral-soft text-coral", tone: "danger" },
  { id: "offer_received", label: "Offer received", tint: "bg-sage-soft text-sage", tone: "success" },
  {
    id: "move_in_scheduled",
    label: "Move-in scheduled",
    tint: "bg-brand-soft text-brand-strong",
    tone: "brand",
  },
  { id: "withdrawn", label: "Withdrawn", tint: "bg-bg-soft text-ink-muted", tone: "neutral" },
  { id: "closed", label: "Closed", tint: "bg-bg-soft text-ink-faint", tone: "neutral" },
];

/** @deprecated use STATUS_META */
export const statusColumns = STATUS_META;

function ev(
  id: string,
  type: TimelineEventType,
  label: string,
  date: string,
  done = true,
  detail?: string,
): TimelineEvent {
  return { id, type, label, date, done, detail };
}

export const applications: Application[] = [
  {
    id: "app-1",
    residenceId: "maple-grove",
    residenceName: "Maple Grove Residence",
    image: images.caregiverSenior,
    status: "approved",
    submittedDate: "Mar 12, 2026",
    lastUpdated: "Apr 2, 2026",
    waitingPosition: null,
    estimatedAdmission: "Aug 1, 2026",
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Review move-in checklist",
    contactName: "Sofia Nguyen",
    contactRole: "Admissions",
    upcomingAppointment: "Move-in walkthrough · Jul 28, 10:00 AM",
    unreadMessages: 1,
    timeline: [
      ev("1a", "created", "Application created", "Mar 10", true),
      ev("1b", "sent", "Submitted", "Mar 12", true),
      ev("1c", "received", "Received by community", "Mar 12", true),
      ev("1d", "viewed", "Reviewed by admissions", "Mar 18", true),
      ev("1e", "decision", "Approved", "Apr 2", true, "Admissions approved placement"),
    ],
  },
  {
    id: "app-2",
    residenceId: "cedar-memory",
    residenceName: "Cedar Memory Care",
    image: images.holdingHands,
    status: "waitlisted",
    submittedDate: "Mar 12, 2026",
    lastUpdated: "Apr 5, 2026",
    waitingPosition: 4,
    estimatedAdmission: "Oct 2026",
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Confirm you want to stay on the waitlist",
    contactName: "Aisha Rahman",
    contactRole: "Memory care admissions",
    upcomingAppointment: null,
    unreadMessages: 0,
    timeline: [
      ev("2a", "sent", "Submitted", "Mar 12", true),
      ev("2b", "viewed", "Under review", "Mar 20", true),
      ev("2c", "status", "Waitlisted", "Apr 5", true, "Position #4"),
    ],
  },
  {
    id: "app-3",
    residenceId: "lakeside-haven",
    residenceName: "Lakeside Haven",
    image: images.gentleCare,
    status: "more_info",
    submittedDate: "Apr 1, 2026",
    lastUpdated: "Apr 8, 2026",
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: ["Doctor’s letter", "Recent lab results"],
    missingDocuments: ["Doctor’s letter", "Recent lab results"],
    nextAction: "Upload requested documents",
    contactName: "Thomas Berger",
    contactRole: "Admissions nurse",
    upcomingAppointment: null,
    unreadMessages: 2,
    timeline: [
      ev("3a", "sent", "Submitted", "Apr 1", true),
      ev("3b", "received", "Received", "Apr 1", true),
      ev("3c", "request", "More information needed", "Apr 8", true, "Doctor’s letter, lab results"),
      ev("3d", "status", "Under review", "—", false),
    ],
  },
  {
    id: "app-4",
    residenceId: "orchard-house",
    residenceName: "Orchard House",
    image: images.grandmotherChild,
    status: "under_review",
    submittedDate: "Apr 10, 2026",
    lastUpdated: "Apr 14, 2026",
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Wait for admissions update",
    contactName: "Emma Walsh",
    contactRole: "Community director",
    upcomingAppointment: null,
    unreadMessages: 0,
    timeline: [
      ev("4a", "sent", "Submitted", "Apr 10", true),
      ev("4b", "viewed", "Under review", "Apr 14", true),
    ],
  },
  {
    id: "app-5",
    residenceId: "sunrise-terrace",
    residenceName: "Sunrise Terrace",
    image: images.seniorsTogether,
    status: "tour_requested",
    submittedDate: "Apr 15, 2026",
    lastUpdated: "Apr 18, 2026",
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Pick a tour time",
    contactName: "Julie Tremblay",
    contactRole: "Family liaison",
    upcomingAppointment: "Tour proposed · Sat 11:00 AM",
    unreadMessages: 1,
    timeline: [
      ev("5a", "sent", "Submitted", "Apr 15", true),
      ev("5b", "received", "Received", "Apr 15", true),
      ev("5c", "appointment", "Tour requested", "Apr 18", true, "Saturday morning slot offered"),
    ],
  },
  {
    id: "app-6",
    residenceId: "riverside-nursing",
    residenceName: "Riverside Nursing Home",
    image: images.adultChildParent,
    status: "draft",
    submittedDate: null,
    lastUpdated: "Apr 16, 2026",
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: [],
    missingDocuments: ["Physician report", "Insurance card"],
    nextAction: "Finish and submit application",
    contactName: "—",
    contactRole: "Not assigned",
    upcomingAppointment: null,
    unreadMessages: 0,
    timeline: [ev("6a", "created", "Draft started", "Apr 16", true)],
  },
  {
    id: "app-7",
    residenceId: "hillcrest-manor",
    residenceName: "Hillcrest Manor",
    image: images.familyVisit,
    status: "declined",
    submittedDate: "Feb 20, 2026",
    lastUpdated: "Mar 10, 2026",
    waitingPosition: null,
    estimatedAdmission: null,
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Consider other communities",
    contactName: "Carlos Mendez",
    contactRole: "Admissions",
    upcomingAppointment: null,
    unreadMessages: 0,
    timeline: [
      ev("7a", "sent", "Submitted", "Feb 20", true),
      ev("7b", "viewed", "Under review", "Mar 1", true),
      ev("7c", "decision", "Declined", "Mar 10", true, "Not a capacity match"),
    ],
  },
  {
    id: "app-8",
    residenceId: "maple-grove",
    residenceName: "Maple Grove Residence",
    image: images.caregiverSenior,
    status: "offer_received",
    submittedDate: "May 2, 2026",
    lastUpdated: "May 20, 2026",
    waitingPosition: null,
    estimatedAdmission: "Sep 1, 2026",
    requestedDocuments: [],
    missingDocuments: [],
    nextAction: "Accept or decline the suite offer",
    contactName: "Sofia Nguyen",
    contactRole: "Admissions",
    upcomingAppointment: null,
    unreadMessages: 0,
    timeline: [
      ev("8a", "sent", "Submitted", "May 2", true),
      ev("8b", "status", "Conditionally approved", "May 12", true),
      ev("8c", "decision", "Offer received", "May 20", true, "Garden suite proposed"),
    ],
  },
];

export function getApplication(id: string) {
  return applications.find((a) => a.id === id);
}

export function statusLabel(id: ApplicationStatus | string) {
  const n = normalizeApplicationStatus(id);
  return STATUS_META.find((s) => s.id === n)?.label || id;
}

export function statusTone(id: ApplicationStatus | string) {
  const n = normalizeApplicationStatus(id);
  return STATUS_META.find((s) => s.id === n)?.tone || "neutral";
}

export function nextActionForStatus(status: ApplicationStatus, missing: string[]): string {
  switch (status) {
    case "draft":
      return "Finish and submit application";
    case "ready":
      return "Submit application";
    case "submitted":
    case "received":
      return "Wait for community acknowledgement";
    case "under_review":
      return "Wait for admissions update";
    case "more_info":
      return missing[0] ? `Upload: ${missing[0]}` : "Respond to document request";
    case "assessment_requested":
      return "Schedule clinical assessment";
    case "tour_requested":
      return "Confirm tour time";
    case "waitlisted":
      return "Confirm waitlist preference";
    case "conditionally_approved":
      return "Complete remaining conditions";
    case "approved":
      return "Prepare for move-in";
    case "offer_received":
      return "Accept or decline offer";
    case "move_in_scheduled":
      return "Complete move-in checklist";
    case "declined":
      return "Explore other communities";
    case "withdrawn":
    case "closed":
      return "No action required";
    default:
      return "Review application";
  }
}
