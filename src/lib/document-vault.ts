/** Family document center — categories, statuses, readiness checklist */

export const DOC_CATEGORIES = [
  { id: "identification", label: "Identification" },
  { id: "insurance_card", label: "Insurance card" },
  { id: "medicare", label: "Medicare card" },
  { id: "medicaid", label: "Medicaid information" },
  { id: "ltc_insurance", label: "Long-term care insurance" },
  { id: "medication_list", label: "Medication list" },
  { id: "physician_report", label: "Physician report" },
  { id: "medical_history", label: "Medical history" },
  { id: "care_assessment", label: "Care assessment" },
  { id: "power_of_attorney", label: "Power of attorney" },
  { id: "guardianship", label: "Guardianship document" },
  { id: "financial", label: "Financial documents" },
  { id: "vaccination", label: "Vaccination records" },
  { id: "discharge", label: "Discharge documents" },
  { id: "facility_forms", label: "Facility forms" },
  { id: "other", label: "Other" },
] as const;

export type DocCategoryId = (typeof DOC_CATEGORIES)[number]["id"];

/** @deprecated alias — use DocCategoryId */
export type DocCategory = DocCategoryId;

export const DOC_STATUSES = [
  { id: "uploaded", label: "Uploaded", tone: "brand" as const },
  { id: "under_review", label: "Under review", tone: "accent" as const },
  { id: "verified", label: "Verified", tone: "success" as const },
  { id: "expired", label: "Expired", tone: "danger" as const },
  { id: "rejected", label: "Rejected", tone: "danger" as const },
  { id: "needs_replacement", label: "Needs replacement", tone: "warn" as const },
] as const;

export type DocStatus = (typeof DOC_STATUSES)[number]["id"];

export type VaultDocument = {
  id: string;
  name: string;
  category: DocCategoryId;
  description: string;
  status: DocStatus;
  /** ISO date YYYY-MM-DD or null */
  expires: string | null;
  size: string;
  sizeBytes: number;
  mimeType: string;
  updated: string;
  createdAt: string;
  versions: number;
  /** Has a file blob stored locally */
  hasFile: boolean;
  /**
   * Communities / applications this doc is explicitly attached to.
   * Empty = private (default).
   */
  sharedWith: string[];
  /** Application ids this document is attached to for submission */
  attachedToApplications: string[];
};

export type DocumentRequest = {
  id: string;
  category: DocCategoryId;
  label: string;
  communityName: string;
  applicationId?: string;
  dueLabel?: string;
  notes?: string;
};

/** Recommended prep checklist for admissions */
export const RECOMMENDED_CHECKLIST: {
  category: DocCategoryId;
  label: string;
  priority: "required" | "recommended";
}[] = [
  { category: "identification", label: "Photo ID / identification", priority: "required" },
  { category: "insurance_card", label: "Insurance card", priority: "required" },
  { category: "medicare", label: "Medicare card", priority: "recommended" },
  { category: "medicaid", label: "Medicaid information", priority: "recommended" },
  { category: "ltc_insurance", label: "Long-term care insurance", priority: "recommended" },
  { category: "medication_list", label: "Current medication list", priority: "required" },
  { category: "physician_report", label: "Physician report / history & physical", priority: "required" },
  { category: "medical_history", label: "Medical history summary", priority: "recommended" },
  { category: "care_assessment", label: "Care assessment", priority: "recommended" },
  { category: "power_of_attorney", label: "Power of attorney", priority: "required" },
  { category: "guardianship", label: "Guardianship (if applicable)", priority: "recommended" },
  { category: "vaccination", label: "Vaccination records", priority: "recommended" },
  { category: "discharge", label: "Hospital discharge papers (if any)", priority: "recommended" },
  { category: "financial", label: "Financial documents", priority: "recommended" },
];

const LEGACY_CATEGORY: Record<string, DocCategoryId> = {
  Medical: "medical_history",
  Insurance: "insurance_card",
  Identity: "identification",
  Assessments: "care_assessment",
  Other: "other",
};

export function categoryLabel(id: string) {
  return DOC_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function statusMeta(id: DocStatus) {
  return DOC_STATUSES.find((s) => s.id === id) ?? DOC_STATUSES[0];
}

export function formatFileSize(bytes: number) {
  if (!bytes || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isExpired(expires: string | null, status?: DocStatus) {
  if (status === "expired") return true;
  if (!expires) return false;
  const d = new Date(expires);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function effectiveStatus(doc: VaultDocument): DocStatus {
  if (isExpired(doc.expires, doc.status) && doc.status !== "rejected") return "expired";
  return doc.status;
}

export function migrateDocument(raw: Record<string, unknown>): VaultDocument {
  const legacyCat = String(raw.category || "other");
  const category =
    (DOC_CATEGORIES.find((c) => c.id === legacyCat)?.id as DocCategoryId | undefined) ||
    LEGACY_CATEGORY[legacyCat] ||
    "other";

  const statusRaw = String(raw.status || "uploaded");
  const status = (DOC_STATUSES.find((s) => s.id === statusRaw)?.id ?? "uploaded") as DocStatus;

  return {
    id: String(raw.id || `doc-${Date.now()}`),
    name: String(raw.name || "Untitled"),
    category,
    description: String(raw.description || ""),
    status,
    expires: (raw.expires as string | null) ?? null,
    size: String(raw.size || "—"),
    sizeBytes: Number(raw.sizeBytes) || 0,
    mimeType: String(raw.mimeType || "application/octet-stream"),
    updated: String(raw.updated || new Date().toLocaleDateString("en-CA")),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    versions: Number(raw.versions) || 1,
    hasFile: Boolean(raw.hasFile),
    sharedWith: Array.isArray(raw.sharedWith) ? (raw.sharedWith as string[]) : [],
    attachedToApplications: Array.isArray(raw.attachedToApplications)
      ? (raw.attachedToApplications as string[])
      : [],
  };
}

export type ChecklistRow = {
  category: DocCategoryId;
  label: string;
  priority: "required" | "recommended" | "requested";
  state: "missing" | "uploaded" | "expired" | "needs_replacement" | "verified" | "under_review" | "rejected";
  documentIds: string[];
  requestedBy?: string;
};

export function buildDocumentChecklist(
  documents: VaultDocument[],
  requests: DocumentRequest[],
): ChecklistRow[] {
  const rows: ChecklistRow[] = RECOMMENDED_CHECKLIST.map((item) => {
    const matches = documents.filter((d) => d.category === item.category);
    const eff = matches.map(effectiveStatus);
    let state: ChecklistRow["state"] = "missing";
    if (matches.length === 0) state = "missing";
    else if (eff.some((s) => s === "verified")) state = "verified";
    else if (eff.some((s) => s === "needs_replacement")) state = "needs_replacement";
    else if (eff.some((s) => s === "expired")) state = "expired";
    else if (eff.some((s) => s === "rejected")) state = "rejected";
    else if (eff.some((s) => s === "under_review")) state = "under_review";
    else state = "uploaded";

    return {
      category: item.category,
      label: item.label,
      priority: item.priority,
      state,
      documentIds: matches.map((d) => d.id),
    };
  });

  // Facility requests not already covered as same category with a note
  requests.forEach((req) => {
    const existing = rows.find((r) => r.category === req.category && r.state !== "missing");
    if (existing) {
      existing.requestedBy = req.communityName;
      if (existing.priority === "recommended") existing.priority = "requested";
      return;
    }
    const matches = documents.filter((d) => d.category === req.category);
    rows.push({
      category: req.category,
      label: req.label,
      priority: "requested",
      state: matches.length ? effectiveStatus(matches[0]) === "expired" ? "expired" : "uploaded" : "missing",
      documentIds: matches.map((d) => d.id),
      requestedBy: req.communityName,
    });
  });

  return rows;
}

export function documentReadiness(documents: VaultDocument[], requests: DocumentRequest[]) {
  const checklist = buildDocumentChecklist(documents, requests);
  const required = checklist.filter((r) => r.priority === "required" || r.priority === "requested");
  const requiredDone = required.filter((r) => r.state !== "missing" && r.state !== "expired" && r.state !== "needs_replacement" && r.state !== "rejected");
  const uploaded = documents.length;
  const missing = checklist.filter((r) => r.state === "missing").length;
  const expired = checklist.filter((r) => r.state === "expired").length + documents.filter((d) => effectiveStatus(d) === "expired").length;
  const requestedMissing = checklist.filter((r) => r.priority === "requested" && r.state === "missing").length;

  const completeness =
    required.length === 0
      ? documents.length > 0
        ? 60
        : 0
      : Math.round((requiredDone.length / required.length) * 100);

  return {
    checklist,
    completeness,
    uploaded,
    missing,
    expired: Math.min(expired, checklist.length),
    requestedMissing,
    recommendedTotal: checklist.length,
    addedCategories: new Set(documents.map((d) => d.category)).size,
  };
}

export const DEMO_DOCUMENT_REQUESTS: DocumentRequest[] = [
  {
    id: "req-1",
    category: "physician_report",
    label: "Updated physician report (last 30 days)",
    communityName: "Lakeside Haven",
    applicationId: "app-2",
    dueLabel: "Due in 5 days",
    notes: "Must include medication list and mobility notes.",
  },
  {
    id: "req-2",
    category: "power_of_attorney",
    label: "Power of attorney (copy)",
    communityName: "Maple Grove Residence",
    applicationId: "app-1",
    dueLabel: "Requested",
  },
];

export const SHARE_TARGETS = [
  { id: "app-maple", label: "Maple Grove — Application", kind: "application" as const },
  { id: "app-lakeside", label: "Lakeside Haven — Application", kind: "application" as const },
  { id: "app-cedar", label: "Cedar Memory Care — Application", kind: "application" as const },
  { id: "community-orchard", label: "Orchard House (preview share)", kind: "community" as const },
];

export const MAX_DOC_BYTES = 4 * 1024 * 1024; // 4 MB local demo limit
