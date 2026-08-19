/**
 * Consent & data governance — types.
 * Legal copy is NEVER authored here as definitive text; use LEGAL_PLACEHOLDER_* only.
 */

export type ConsentSubjectRole =
  | "resident"
  | "caregiver"
  | "legal_representative"
  | "other";

export type PurposeCategory = "essential" | "optional";

export type ConsentPurposeId =
  | "account_operation"
  | "admissions_application"
  | "document_sharing"
  | "community_messaging"
  | "product_updates"
  | "marketing_communications"
  | "analytics_improvement";

export type ConsentEventType =
  | "granted"
  | "withdrawn"
  | "amended"
  | "expired"
  | "rectified_subject"
  | "legal_hold_applied"
  | "legal_hold_released";

export type AuthorityProofKind =
  | "none"
  | "power_of_attorney"
  | "guardianship"
  | "healthcare_proxy"
  | "other_documented";

/** Exact version of a legal/policy text accepted by the user. */
export type PolicyTextVersion = {
  id: string;
  /** e.g. terms_of_use | privacy_notice | purpose_<id> */
  documentKey: string;
  version: string;
  /** ISO date the version became effective */
  effectiveFrom: string;
  /**
   * LEGAL PLACEHOLDER — replace with counsel-approved copy before production.
   * Must remain clearly marked until validated.
   */
  bodyPlaceholder: string;
  language: "en" | "fr";
};

export type AcceptedPurpose = {
  purposeId: ConsentPurposeId;
  category: PurposeCategory;
  /** Policy text version id for this purpose disclosure */
  policyVersionId: string;
  accepted: boolean;
  acceptedAt: string | null;
};

export type TransmittedEstablishment = {
  establishmentId: string;
  establishmentName: string;
  transmittedAt: string;
  applicationId?: string;
  purposeIds: ConsentPurposeId[];
};

export type AuthorityProof = {
  kind: AuthorityProofKind;
  /** Opaque reference to an uploaded proof document (never raw PII path) */
  documentRef: string | null;
  notedAt: string;
  /** LEGAL PLACEHOLDER description of what was verified */
  verificationNotePlaceholder: string;
};

export type ConsentRecordV2 = {
  id: string;
  /** Subject who the data concerns (may differ from consenter) */
  subjectDisplayName: string;
  subjectRoleHint: ConsentSubjectRole;
  /** Person who performed the consent action */
  consenterDisplayName: string;
  consenterEmail: string;
  consenterUserId: string;
  consenterRole: ConsentSubjectRole;
  /** Exact policy bundle accepted */
  policyBundleVersionId: string;
  purposes: AcceptedPurpose[];
  context: {
    surface: string;
    userAgentHint?: string;
    ipHash?: string;
  };
  grantedAt: string;
  /** null = until withdrawn or policy-defined maximum */
  expiresAt: string | null;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  authorityProof: AuthorityProof | null;
  establishments: TransmittedEstablishment[];
  active: boolean;
  history: ConsentHistoryEntry[];
};

export type ConsentHistoryEntry = {
  id: string;
  at: string;
  type: ConsentEventType;
  actorUserId: string;
  actorDisplayName: string;
  detail: string;
  /** Snapshot of purpose acceptance map after change */
  purposesSnapshot?: Record<string, boolean>;
};

export type DataCategory =
  | "account_profile"
  | "senior_dossier"
  | "documents"
  | "applications"
  | "messages"
  | "consent_records"
  | "access_logs"
  | "analytics_events";

export type RetentionPolicy = {
  dataCategory: DataCategory;
  /** Days to retain after last activity / account closure trigger */
  retainDays: number;
  actionOnExpiry: "delete" | "anonymize" | "archive_legal_hold";
  /** LEGAL PLACEHOLDER rationale */
  rationalePlaceholder: string;
};

export type LegalHold = {
  id: string;
  reasonPlaceholder: string;
  placedAt: string;
  placedBy: string;
  releasedAt: string | null;
  /** Categories frozen against erasure */
  dataCategories: DataCategory[];
};

export type RectificationRequest = {
  id: string;
  requestedAt: string;
  fieldPath: string;
  requestedValueSummary: string;
  status: "pending" | "completed" | "rejected";
  completedAt: string | null;
  note: string;
};

export type StructuredExportManifest = {
  exportId: string;
  requestedAt: string;
  completedAt: string;
  format: "json";
  sections: string[];
  disclaimerPlaceholder: string;
};

export type ErasureRequest = {
  id: string;
  requestedAt: string;
  mode: "delete" | "anonymize";
  status:
    | "pending"
    | "blocked_legal_hold"
    | "propagating"
    | "completed"
    | "cancelled";
  blockedReasonPlaceholder: string | null;
  propagation: ErasurePropagationStep[];
  completedAt: string | null;
};

export type ErasurePropagationStep = {
  target:
    | "primary_store"
    | "document_storage"
    | "community_copies"
    | "subprocessor"
    | "backups";
  status: "pending" | "notified" | "completed" | "deferred_backup_cycle";
  detail: string;
  at: string;
};

export type ConsentGovernanceWorkspace = {
  version: 2;
  policyBundleVersionId: string;
  records: ConsentRecordV2[];
  retention: RetentionPolicy[];
  legalHolds: LegalHold[];
  rectifications: RectificationRequest[];
  erasureRequests: ErasureRequest[];
  exports: StructuredExportManifest[];
  abandonedApplicationExpireDays: number;
  updatedAt: string;
};
