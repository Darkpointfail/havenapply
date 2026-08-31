/** Inter-facility patient transfer packets for community admissions. */

export const TRANSFER_REASONS = [
  { id: "higher_acuity", label: "Needs higher acuity / skilled nursing" },
  { id: "memory_care", label: "Needs memory / secure care" },
  { id: "rehab", label: "Short-term rehabilitation" },
  { id: "closer_family", label: "Closer to family" },
  { id: "bed_availability", label: "Bed / capacity unavailable here" },
  { id: "payer_change", label: "Payer / coverage change" },
  { id: "resident_request", label: "Resident or family request" },
  { id: "clinical_specialist", label: "Specialized clinical services" },
  { id: "other", label: "Other" },
] as const;

export type TransferReasonId = (typeof TRANSFER_REASONS)[number]["id"];

export const TRANSFER_URGENCY = [
  { id: "routine", label: "Routine" },
  { id: "soon", label: "Within 2 weeks" },
  { id: "urgent", label: "Urgent (72 hours)" },
  { id: "immediate", label: "Immediate" },
] as const;

export type TransferUrgencyId = (typeof TRANSFER_URGENCY)[number]["id"];

export const TRANSFER_STATUSES = [
  { id: "draft", label: "Draft", tone: "neutral" as const },
  { id: "ready", label: "Ready to send", tone: "brand" as const },
  { id: "sent", label: "Sent to receiving center", tone: "accent" as const },
  { id: "acknowledged", label: "Acknowledged", tone: "success" as const },
  { id: "completed", label: "Transfer completed", tone: "success" as const },
  { id: "cancelled", label: "Cancelled", tone: "danger" as const },
] as const;

export type TransferStatusId = (typeof TRANSFER_STATUSES)[number]["id"];

export type TransferDestination = {
  facilityId: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  address: string;
  source: "medicare" | "curated" | "manual";
};

export type TransferDocumentItem = {
  id: string;
  label: string;
  included: boolean;
};

export const DEFAULT_TRANSFER_DOCUMENTS: TransferDocumentItem[] = [
  { id: "face_sheet", label: "Face sheet / demographics", included: true },
  { id: "med_list", label: "Current medication list", included: true },
  { id: "allergies", label: "Allergies & reactions", included: true },
  { id: "diagnoses", label: "Diagnoses / problem list", included: true },
  { id: "adl", label: "ADL / mobility summary", included: true },
  { id: "physician_orders", label: "Physician orders / H&P", included: true },
  { id: "insurance", label: "Insurance / Medicare / Medicaid cards", included: true },
  { id: "poa", label: "POA / healthcare proxy / guardianship", included: true },
  { id: "advance_directives", label: "Advance directives (DNR / MOLST)", included: false },
  { id: "labs", label: "Recent labs / imaging", included: false },
  { id: "behavioral", label: "Behavioral / wandering notes", included: false },
];

export type PatientTransfer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: TransferStatusId;
  createdBy: string;

  /** Optional link to an accepted / active application dossier */
  applicationId: string | null;
  residentName: string;
  dateOfBirth: string;
  gender: string;

  reasonId: TransferReasonId | "";
  reasonDetails: string;
  urgency: TransferUrgencyId;
  preferredTransferDate: string;

  destination: TransferDestination | null;
  receivingContactName: string;
  receivingContactPhone: string;
  receivingContactEmail: string;

  /** Packet content for the receiving center */
  diagnoses: string;
  medications: string;
  allergies: string;
  mobilityAdls: string;
  cognitionBehavior: string;
  specialCareNeeds: string;
  equipmentTreatments: string;
  insurancePayor: string;
  physicianName: string;
  physicianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  familyContactName: string;
  familyContactPhone: string;
  notesForReceivingCenter: string;

  documents: TransferDocumentItem[];
  sentAt: string | null;
  timeline: { id: string; at: string; actor: string; action: string; detail?: string }[];
};

export function emptyPatientTransfer(actor = "Admissions"): PatientTransfer {
  const now = new Date().toISOString();
  return {
    id: `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    createdBy: actor,
    applicationId: null,
    residentName: "",
    dateOfBirth: "",
    gender: "",
    reasonId: "",
    reasonDetails: "",
    urgency: "routine",
    preferredTransferDate: "",
    destination: null,
    receivingContactName: "",
    receivingContactPhone: "",
    receivingContactEmail: "",
    diagnoses: "",
    medications: "",
    allergies: "",
    mobilityAdls: "",
    cognitionBehavior: "",
    specialCareNeeds: "",
    equipmentTreatments: "",
    insurancePayor: "",
    physicianName: "",
    physicianPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    familyContactName: "",
    familyContactPhone: "",
    notesForReceivingCenter: "",
    documents: DEFAULT_TRANSFER_DOCUMENTS.map((d) => ({ ...d })),
    sentAt: null,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        at: now,
        actor,
        action: "Transfer draft created",
      },
    ],
  };
}

export function transferStatusMeta(status: TransferStatusId) {
  return TRANSFER_STATUSES.find((s) => s.id === status) || TRANSFER_STATUSES[0];
}

export function transferReasonLabel(id: string) {
  return TRANSFER_REASONS.find((r) => r.id === id)?.label || id || "Not set";
}

export function transferPacketReady(t: PatientTransfer): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!t.residentName.trim()) missing.push("Resident name");
  if (!t.reasonId) missing.push("Transfer reason");
  if (!t.destination?.name) missing.push("Destination facility");
  if (!t.diagnoses.trim() && !t.medications.trim()) {
    missing.push("Clinical summary (diagnoses or medications)");
  }
  return { ok: missing.length === 0, missing };
}

/** Minimal app snapshot used to prefill a transfer packet (avoids circular imports). */
export type TransferPrefillSource = {
  id: string;
  seniorName: string;
  careNeeds?: string[];
  medicalHighlights?: string[];
  paymentMethod?: string;
  family?: { name: string; phone: string };
  emergencyContact?: { name: string; phone: string };
  insights?: {
    primaryDiagnoses?: string[];
    mobilityLevel?: string;
    cognitiveStatus?: string;
    importantMedications?: string[];
    allergies?: string[];
    specialConsiderations?: string[];
  };
  dossier?: {
    dateOfBirth?: string;
    gender?: string;
    primaryPhysician?: string;
    physicianPhone?: string;
    insurancePrimary?: string;
    insuranceSecondary?: string;
    pathologies?: { name: string }[];
    medications?: { name: string; dose?: string }[];
    allergies?: { substance: string; reaction?: string }[];
    adls?: { activity: string; level: string }[];
    mobilityAids?: string[];
    diet?: string;
    continence?: string;
    cognitiveNotes?: string;
    behaviors?: string[];
    codeStatus?: string;
    advanceDirectives?: string;
    fallHistory?: string;
  };
};

export function buildTransferFromApplication(
  app: TransferPrefillSource,
  actor = "Admissions",
): PatientTransfer {
  const base = emptyPatientTransfer(actor);
  const d = app.dossier;
  const insights = app.insights;

  const diagnoses = [
    ...(insights?.primaryDiagnoses || []),
    ...(d?.pathologies?.map((p) => p.name) || []),
    ...(app.medicalHighlights || []),
  ]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join("; ");

  const medications =
    (d?.medications || [])
      .map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`.trim())
      .filter(Boolean)
      .join("\n") || (insights?.importantMedications || []).join("\n");

  const allergies =
    (d?.allergies || [])
      .map((a) => `${a.substance}${a.reaction ? ` : ${a.reaction}` : ""}`)
      .join("\n") || (insights?.allergies || []).join("\n");

  const mobilityAdls = [
    insights?.mobilityLevel,
    ...(d?.adls?.map((a) => `${a.activity}: ${a.level}`) || []),
    ...(d?.mobilityAids || []),
    d?.fallHistory ? `Falls: ${d.fallHistory}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const cognitionBehavior = [
    insights?.cognitiveStatus,
    d?.cognitiveNotes,
    ...(d?.behaviors || []),
  ]
    .filter(Boolean)
    .join("\n");

  const specialCareNeeds = [
    ...(app.careNeeds || []),
    ...(insights?.specialConsiderations || []),
    d?.diet ? `Diet: ${d.diet}` : "",
    d?.continence ? `Continence: ${d.continence}` : "",
    d?.codeStatus ? `Code status: ${d.codeStatus}` : "",
    d?.advanceDirectives ? `Directives: ${d.advanceDirectives}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...base,
    applicationId: app.id,
    residentName: app.seniorName,
    dateOfBirth: d?.dateOfBirth || "",
    gender: d?.gender || "",
    diagnoses,
    medications,
    allergies,
    mobilityAdls,
    cognitionBehavior,
    specialCareNeeds,
    equipmentTreatments: (d?.mobilityAids || []).join(", "),
    insurancePayor: [d?.insurancePrimary, d?.insuranceSecondary, app.paymentMethod]
      .filter(Boolean)
      .join(" · "),
    physicianName: d?.primaryPhysician || "",
    physicianPhone: d?.physicianPhone || "",
    emergencyContactName: app.emergencyContact?.name || "",
    emergencyContactPhone: app.emergencyContact?.phone || "",
    familyContactName: app.family?.name || "",
    familyContactPhone: app.family?.phone || "",
    timeline: [
      {
        id: `tl-${Date.now()}`,
        at: base.createdAt,
        actor,
        action: "Transfer draft created from resident dossier",
        detail: app.seniorName,
      },
    ],
  };
}
