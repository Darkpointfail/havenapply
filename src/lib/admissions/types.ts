/**
 * Server contract for admissions.
 * See docs/architecture/ADMISSIONS_SERVER_FLOW.md for the business contract.
 *
 * These records are the source of truth. The client never supplies the owning
 * family, the target site it is allowed to read, or the staff role.
 */

export const ADMISSION_STATUSES = [
  "draft",
  "submitted",
  "received",
  "under_review",
  "more_info",
  "tour_requested",
  "assessment_requested",
  "waitlisted",
  "approved",
  "declined",
  "withdrawn",
  "closed",
] as const;

export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

/** Statuses a family may no longer act on. */
export const TERMINAL_STATUSES: AdmissionStatus[] = ["declined", "withdrawn", "closed"];

export type AdmissionActorType = "family" | "staff" | "system";

export type AdmissionDocumentMeta = {
  id: string;
  name: string;
  category: string;
  shared: boolean;
};

export type AdmissionSenior = {
  name: string;
  age: number | null;
  relationship: string;
  photoUrl: string | null;
};

export type AdmissionFamilyContact = {
  name: string;
  email: string;
  phone: string;
  relationship: string;
};

export type AdmissionDecision = {
  kind: string;
  note: string | null;
  at: string;
} | null;

export type AdmissionApplicationRecord = {
  id: string;
  /** Owning family, resolved from the session. Never read from the request body. */
  familyUserId: string;
  familyEmail: string;
  /** Target residence, validated against the site registry. */
  siteId: string;
  siteName: string;
  /** Idempotency key, unique per family. */
  clientRequestId: string;
  publicRef: string | null;
  personRef: string | null;
  dossierRef: string | null;
  status: AdmissionStatus;
  senior: AdmissionSenior;
  summary: string;
  careNeeds: string[];
  medicalHighlights: string[];
  /** Metadata only — file bytes are not shared with staff in this milestone. */
  documents: AdmissionDocumentMeta[];
  familyContact: AdmissionFamilyContact;
  desiredMoveIn: string | null;
  waitlistPosition: number | null;
  decision: AdmissionDecision;
  /** True only for explicitly seeded development data. */
  isSeed: boolean;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string;
};

export type AdmissionStatusEvent = {
  id: string;
  applicationId: string;
  fromStatus: AdmissionStatus | null;
  toStatus: AdmissionStatus;
  actorType: AdmissionActorType;
  actorId: string;
  note: string | null;
  at: string;
};

export type AdmissionAuditEntry = {
  id: string;
  applicationId: string;
  actorType: AdmissionActorType;
  actorId: string;
  actorLabel: string;
  action: string;
  metadata: Record<string, unknown>;
  at: string;
};

export type ResidenceSite = {
  id: string;
  name: string;
  isActive: boolean;
};

export type StaffMembershipRole = "admin" | "manager" | "coordinator" | "readonly";

export type StaffMembership = {
  id: string;
  userId: string;
  email: string;
  siteId: string;
  role: StaffMembershipRole;
  status: "active" | "suspended";
};

export type AdmissionDetail = {
  application: AdmissionApplicationRecord;
  statusEvents: AdmissionStatusEvent[];
  audit: AdmissionAuditEntry[];
};

/** Payload a family may send. Ownership fields are deliberately absent. */
export type AdmissionSubmitInput = {
  clientRequestId: string;
  siteId: string;
  siteName?: string;
  publicRef?: string | null;
  personRef?: string | null;
  dossierRef?: string | null;
  senior?: Partial<AdmissionSenior>;
  summary?: string;
  careNeeds?: string[];
  medicalHighlights?: string[];
  documents?: AdmissionDocumentMeta[];
  familyContact?: Partial<AdmissionFamilyContact>;
  desiredMoveIn?: string | null;
};

export type AdmissionRepositoryError = {
  ok: false;
  status: number;
  error: string;
};

export type AdmissionResult<T> = { ok: true; data: T } | AdmissionRepositoryError;

export function isAdmissionStatus(value: unknown): value is AdmissionStatus {
  return typeof value === "string" && (ADMISSION_STATUSES as readonly string[]).includes(value);
}
