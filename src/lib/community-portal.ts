/** Community partner portal, roles, applications, availability, profile, audit */

import type { ApplicationStatus } from "@/data/applications";
import { STATUS_META } from "@/data/applications";
import { getResidence } from "@/data/residences";
import { buildCommunityDetail } from "@/lib/residence-detail";
import { residencesForCommunityOrg } from "@/lib/messaging";
import type { PatientTransfer } from "@/lib/patient-transfer";

export type CommunityTeamRole =
  | "admin"
  | "admissions_manager"
  | "sales_counselor"
  | "nurse_reviewer"
  | "readonly";

export type CommunityPermission =
  | "viewDashboard"
  | "viewApplications"
  | "assignApplications"
  | "addInternalNotes"
  | "requestInfo"
  | "requestDocuments"
  | "proposeTour"
  | "proposeAssessment"
  | "changeStatus"
  | "acceptDecline"
  | "editProfile"
  | "editAvailability"
  | "editPricing"
  | "editAdmissions"
  | "manageTeam"
  | "viewAudit";

export const COMMUNITY_ROLES: {
  id: CommunityTeamRole;
  label: string;
  description: string;
}[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Full control of community settings, team, and admissions.",
  },
  {
    id: "admissions_manager",
    label: "Admissions Coordinator",
    description: "Review applications, message families, and make decisions.",
  },
  {
    id: "sales_counselor",
    label: "Admissions Coordinator",
    description: "Review applications and coordinate with families.",
  },
  {
    id: "nurse_reviewer",
    label: "Admissions Coordinator",
    description: "Review care needs and clinical documents.",
  },
  {
    id: "readonly",
    label: "Viewer",
    description: "View applications without making changes.",
  },
];

/** Roles shown when inviting teammates */
export const COMMUNITY_INVITE_ROLES: CommunityTeamRole[] = [
  "admin",
  "admissions_manager",
  "readonly",
];

export const COMMUNITY_PERMISSION_LABELS: Record<CommunityPermission, string> = {
  viewDashboard: "View dashboard",
  viewApplications: "View applications",
  assignApplications: "Assign applications",
  addInternalNotes: "Add internal notes",
  requestInfo: "Request information",
  requestDocuments: "Request documents",
  proposeTour: "Propose a visit",
  proposeAssessment: "Propose an assessment",
  changeStatus: "Change application status",
  acceptDecline: "Accept or decline",
  editProfile: "Edit community profile",
  editAvailability: "Edit availability",
  editPricing: "Edit pricing",
  editAdmissions: "Edit admission criteria",
  manageTeam: "Manage team",
  viewAudit: "View audit history",
};

const ALL = Object.keys(COMMUNITY_PERMISSION_LABELS) as CommunityPermission[];

const ROLE_PERMS: Record<CommunityTeamRole, CommunityPermission[]> = {
  admin: ALL,
  admissions_manager: [
    "viewDashboard",
    "viewApplications",
    "assignApplications",
    "addInternalNotes",
    "requestInfo",
    "requestDocuments",
    "proposeTour",
    "proposeAssessment",
    "changeStatus",
    "acceptDecline",
    "editAvailability",
    "viewAudit",
  ],
  sales_counselor: [
    "viewDashboard",
    "viewApplications",
    "addInternalNotes",
    "requestInfo",
    "proposeTour",
    "changeStatus",
    "viewAudit",
  ],
  nurse_reviewer: [
    "viewDashboard",
    "viewApplications",
    "addInternalNotes",
    "requestInfo",
    "requestDocuments",
    "proposeAssessment",
    "viewAudit",
  ],
  readonly: ["viewDashboard", "viewApplications", "viewAudit"],
};

export function communityRoleHas(
  role: CommunityTeamRole,
  permission: CommunityPermission,
) {
  return ROLE_PERMS[role].includes(permission);
}

export function communityRoleLabel(role: CommunityTeamRole) {
  return COMMUNITY_ROLES.find((r) => r.id === role)?.label ?? role;
}

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

export type InternalNote = {
  id: string;
  author: string;
  body: string;
  at: string;
};

export type SharedDocument = {
  id: string;
  name: string;
  category: string;
  shared: boolean;
  /** Short AI summary of the document contents */
  aiSummary?: string;
};

export type AdmissionPriority = "high" | "medium" | "low";
export type ReferralSource = "Family" | "Hospital" | "Social Worker";
export type QueueSection = "high" | "medium" | "low";

export type ApplicationInsights = {
  primaryDiagnoses: string[];
  mobilityLevel: string;
  cognitiveStatus: string;
  importantMedications: string[];
  allergies: string[];
  specialConsiderations: string[];
};

export type MedicationEntry = {
  name: string;
  dose: string;
  frequency: string;
  route?: string;
  indication?: string;
  prescribedBy?: string;
};

export type PathologyEntry = {
  name: string;
  status: "active" | "history" | "resolved";
  diagnosedYear?: string;
  notes?: string;
};

export type PreviousFacility = {
  name: string;
  type: string;
  from?: string;
  to?: string;
  reasonForLeaving?: string;
};

export type AdlEntry = {
  activity: string;
  level: string;
};

/** Complete client file shared with admissions for review */
export type ClientDossier = {
  dateOfBirth: string;
  gender: string;
  primaryLanguage: string;
  maritalStatus?: string;
  height?: string;
  weight?: string;
  bloodType?: string;
  currentAddress?: string;
  currentLivingSituation: string;
  primaryPhysician?: string;
  physicianPhone?: string;
  pharmacy?: string;
  insurancePrimary?: string;
  insuranceSecondary?: string;
  pathologies: PathologyEntry[];
  medications: MedicationEntry[];
  allergies: { substance: string; reaction: string; severity?: string }[];
  previousFacilities: PreviousFacility[];
  hospitalizations?: string[];
  surgeries?: string[];
  vaccinations?: string[];
  adls?: AdlEntry[];
  mobilityAids?: string[];
  diet?: string;
  continence?: string;
  cognitiveNotes?: string;
  behaviors?: string[];
  hearingVision?: string;
  codeStatus?: string;
  advanceDirectives?: string;
  fallHistory?: string;
  smokingAlcohol?: string;
  socialSupports?: string;
};

export type CommunityApplication = {
  id: string;
  residenceId: string;
  seniorName: string;
  seniorAge: number;
  /** Optional portrait shared from the family dossier */
  seniorPhotoUrl?: string | null;
  relationship: string;
  summary: string;
  /** Longer AI executive summary for review page */
  executiveSummary?: string;
  careNeeds: string[];
  medicalHighlights: string[];
  insights?: ApplicationInsights;
  /** Full clinical + personal client file */
  dossier?: ClientDossier;
  documents: SharedDocument[];
  family: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  paymentMethod?: string;
  moveInRequested?: string;
  status: ApplicationStatus;
  careType?: string;
  referralSource?: ReferralSource;
  priority?: AdmissionPriority;
  /** @deprecated legacy */
  focusReason?: string;
  /** @deprecated legacy */
  nextAction?: string;
  assigneeId: string | null;
  assigneeName: string | null;
  internalNotes: InternalNote[];
  infoRequest: string | null;
  documentRequest: string | null;
  tourProposal: string | null;
  assessmentProposal: string | null;
  waitlistPosition: number | null;
  submittedAt: string;
  lastUpdated: string;
  auditLog: AuditEntry[];
  /** Guided admission review progress before accept/decline */
  reviewChecklist?: Partial<Record<string, boolean>>;
  /**
   * Post-accept move-in prep: contracts, payment, family logistics.
   * Active while status is in the transition set; cleared when the dossier is closed.
   */
  transitionChecklist?: Partial<Record<string, boolean>>;
  /** Confirmed move-in date once family and community agree (ISO date). */
  moveInConfirmed?: string | null;
  /** Rich guided transition workspace (agreements, payments, family forms, scheduling). */
  transitionWork?: import("@/lib/community-transition").TransitionWork;
};

/** Steps admissions staff should verify before finalizing a decision. */
export const REVIEW_CHECK_ITEMS = [
  {
    id: "identity",
    label: "Identity & demographics",
    hint: "Name, DOB, and ID documents match.",
    sectionId: "section-identity",
    required: true,
  },
  {
    id: "clinical",
    label: "Clinical file",
    hint: "Diagnoses, ADLs, cognition, and care needs.",
    sectionId: "section-clinical",
    required: true,
  },
  {
    id: "medications",
    label: "Medications & allergies",
    hint: "Med list and allergy risks reviewed.",
    sectionId: "section-medications",
    required: true,
  },
  {
    id: "documents",
    label: "Documents packet",
    hint: "Identity, medical, financial, and legal files.",
    sectionId: "section-documents",
    required: true,
  },
  {
    id: "family",
    label: "Family & contacts",
    hint: "Primary contact, emergency contact, payer.",
    sectionId: "section-family",
    required: true,
  },
  {
    id: "fit",
    label: "Program fit",
    hint: "Care level, criteria, and availability align.",
    sectionId: "section-decision",
    required: true,
  },
] as const;

export type ReviewCheckId = (typeof REVIEW_CHECK_ITEMS)[number]["id"];

export function reviewChecklistProgress(app: CommunityApplication) {
  const required = REVIEW_CHECK_ITEMS.filter((c) => c.required);
  const done = required.filter((c) => Boolean(app.reviewChecklist?.[c.id])).length;
  return {
    done,
    total: required.length,
    complete: done === required.length,
    percent: required.length ? Math.round((done / required.length) * 100) : 0,
  };
}

/** Accepted but not yet closed, final details with the family before move-in. */
export const TRANSITION_STATUSES = [
  "approved",
  "conditionally_approved",
  "offer_received",
  "move_in_scheduled",
] as const;

/** Fully decided / archived, no more admissions work. */
export const HISTORY_TERMINAL_STATUSES = [
  "declined",
  "waitlisted",
  "withdrawn",
  "closed",
] as const;

export function isTransitionApplication(app: Pick<CommunityApplication, "status">) {
  return (TRANSITION_STATUSES as readonly string[]).includes(app.status);
}

export function isHistoryTerminalApplication(app: Pick<CommunityApplication, "status">) {
  return (HISTORY_TERMINAL_STATUSES as readonly string[]).includes(app.status);
}

/** Steps between accept and closing the dossier. */
export const TRANSITION_CHECK_ITEMS = [
  {
    id: "contract",
    label: "Residency agreement",
    hint: "Contract sent, reviewed, and signed with the family.",
    required: true,
  },
  {
    id: "payment",
    label: "Deposit & payment",
    hint: "Deposit received and payment method confirmed.",
    required: true,
  },
  {
    id: "familyDetails",
    label: "Final family details",
    hint: "Contacts, belongings, pharmacy, and logistics confirmed.",
    required: true,
  },
  {
    id: "moveInDate",
    label: "Move-in date",
    hint: "Agreed move-in date held on the calendar.",
    required: true,
  },
] as const;

export type TransitionCheckId = (typeof TRANSITION_CHECK_ITEMS)[number]["id"];

export function transitionChecklistProgress(app: CommunityApplication) {
  const required = TRANSITION_CHECK_ITEMS.filter((c) => c.required);
  const done = required.filter((c) => Boolean(app.transitionChecklist?.[c.id])).length;
  return {
    done,
    total: required.length,
    complete: done === required.length,
    percent: required.length ? Math.round((done / required.length) * 100) : 0,
  };
}

export type AvailabilityStatus = "confirmed" | "estimated";

export type AvailabilityUnit = {
  id: string;
  roomType: string;
  count: number;
  availableDate: string;
  price: number | null;
  careLevel: string;
  status: AvailabilityStatus;
  waitlistCount: number;
};

export type CommunityProfile = {
  residenceId: string;
  name: string;
  description: string;
  photos: string[];
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  careTypes: string[];
  amenities: string[];
  services: string[];
  admissionCriteria: string[];
  notAccepted: string[];
  requiredDocuments: string[];
  roomTypes: {
    name: string;
    price: number | null;
    notes: string;
    availableUnits?: number;
  }[];
  promotions: string;
  waitlistNotes: string;
  admissionFlags?: {
    medicaid: boolean;
    privatePay: boolean;
    pets: boolean;
    smoking: string;
    minAge: number;
    notes: string;
  };
};

export type CommunityTeamMember = {
  id: string;
  name: string;
  email: string;
  role: CommunityTeamRole;
  status: "active" | "invited";
  jobTitle: string;
};

export type CommunityPortalNotification = {
  id: string;
  type: "application_received";
  title: string;
  body: string;
  applicationId: string;
  at: string;
  read: boolean;
};

export type CommunityWorkspace = {
  residenceId: string;
  residenceName: string;
  profile: CommunityProfile;
  availability: AvailabilityUnit[];
  applications: CommunityApplication[];
  /** Inter-facility patient transfer packets sent to other centers */
  patientTransfers: PatientTransfer[];
  team: CommunityTeamMember[];
  auditLog: AuditEntry[];
  /** Inbound alerts (e.g. new family applications) */
  notifications: CommunityPortalNotification[];
  /** Demo KPIs */
  metrics: {
    conversionRate: number;
    avgResponseHours: number;
    openBeds: number;
    waitlistTotal: number;
  };
  updatedAt: string;
};

function audit(actor: string, action: string): AuditEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    at: new Date().toISOString(),
    actor,
    action,
  };
}

export function statusLabel(status: ApplicationStatus) {
  return STATUS_META.find((s) => s.id === status)?.label ?? status;
}

export function statusTone(status: ApplicationStatus) {
  return STATUS_META.find((s) => s.id === status)?.tone ?? "neutral";
}

export function formatPortalTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatPortalDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function applicationCareType(app: CommunityApplication) {
  if (app.careType) return app.careType;
  const joined = (app.careNeeds || []).join(" ").toLowerCase();
  if (joined.includes("memory") || joined.includes("alzheimer") || joined.includes("dementia")) {
    return "Memory care";
  }
  if (joined.includes("nursing") || joined.includes("skilled")) return "Skilled nursing";
  if (joined.includes("rehab")) return "Rehabilitation";
  if (joined.includes("independent")) return "Independent living";
  return "Assisted living";
}

/**
 * Keep demo seed dossiers available even when a workspace was created before
 * they existed (deep links like /community/applications/capp-hist-accepted).
 */
export function ensureDemoApplications(ws: CommunityWorkspace): CommunityWorkspace {
  const seeded = seedCommunityWorkspace(ws.residenceId);
  const existingIds = new Set(ws.applications.map((a) => a.id));
  const missing = seeded.applications.filter((a) => !existingIds.has(a.id));
  if (!missing.length) return ws;
  return {
    ...ws,
    applications: [...ws.applications, ...missing],
    updatedAt: new Date().toISOString(),
  };
}

export function applicationReferral(app: CommunityApplication): ReferralSource {
  return app.referralSource || "Family";
}

export function applicationPriority(app: CommunityApplication): AdmissionPriority {
  const raw = app.priority as string | undefined;
  if (raw === "high" || raw === "urgent") return "high";
  if (raw === "medium") return "medium";
  if (raw === "low" || raw === "normal") return "low";
  if (app.referralSource === "Hospital") return "high";
  if (app.moveInRequested) {
    const days =
      (new Date(app.moveInRequested).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(days) && days >= 0 && days <= 14) return "high";
    if (Number.isFinite(days) && days > 90) return "low";
  }
  return "medium";
}

export function queueSectionFor(app: CommunityApplication): QueueSection | null {
  if (
    ["approved", "declined", "withdrawn", "closed", "waitlisted", "offer_received", "conditionally_approved", "move_in_scheduled"].includes(
      app.status,
    )
  ) {
    return null;
  }
  return applicationPriority(app);
}

export function priorityBadgeLabel(p: AdmissionPriority) {
  if (p === "high") return "High priority";
  if (p === "medium") return "Medium priority";
  return "Low priority";
}

export function reviewStatusLabel(app: CommunityApplication) {
  if (app.status === "approved") return "Approved";
  if (app.status === "declined") return "Declined";
  if (app.status === "more_info") return "Waiting on information";
  if (["submitted", "received"].includes(app.status)) return "Application complete · Ready for review";
  if (app.status === "under_review") return "Under review";
  return statusLabel(app.status);
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function documentCategoryGroup(category: string): "Identity" | "Medical" | "Financial" | "Legal" | "Other" {
  const c = category.toLowerCase();
  if (c.includes("identity") || c.includes("id") || c.includes("photo")) return "Identity";
  if (c.includes("clinic") || c.includes("medical") || c.includes("health") || c.includes("med"))
    return "Medical";
  if (c.includes("financ") || c.includes("insur") || c.includes("payment") || c.includes("bank"))
    return "Financial";
  if (c.includes("legal") || c.includes("poa") || c.includes("attorney") || c.includes("consent"))
    return "Legal";
  return "Other";
}

/**
 * Resolve the community (RPA) tenant for a staff account.
 * Returns null when the org/email is not mapped — never falls back to another tenant (IDOR).
 */
export function resolveCommunityResidenceId(
  organization?: string,
  email?: string,
): string | null {
  const ids = residencesForCommunityOrg(organization, email);
  return ids[0] ?? null;
}

export function seedCommunityWorkspace(residenceId: string): CommunityWorkspace {
  const r = getResidence(residenceId);
  if (!r) {
    throw new Error(`Unknown community tenant: ${residenceId}`);
  }
  const detail = buildCommunityDetail(r);
  const now = new Date().toISOString();

  const team: CommunityTeamMember[] = [
    {
      id: "tm-jordan",
      name: "Jordan Lee",
      email: "community@demo.haven",
      role: "admin",
      status: "active",
      jobTitle: "Director of Admissions",
    },
    {
      id: "tm-sofia",
      name: "Sofia Nguyen",
      email: "sofia@maplegrove.demo",
      role: "admissions_manager",
      status: "active",
      jobTitle: "Admissions RN",
    },
    {
      id: "tm-marcus",
      name: "Marcus Hale",
      email: "marcus@maplegrove.demo",
      role: "sales_counselor",
      status: "active",
      jobTitle: "Family counselor",
    },
    {
      id: "tm-priya",
      name: "Priya Shah",
      email: "priya@maplegrove.demo",
      role: "nurse_reviewer",
      status: "active",
      jobTitle: "Clinical reviewer",
    },
    {
      id: "tm-readonly",
      name: "Alex Kim",
      email: "alex@maplegrove.demo",
      role: "readonly",
      status: "invited",
      jobTitle: "Board observer",
    },
  ];

  const applications: CommunityApplication[] = [
    {
      id: "capp-urgent",
      residenceId: r.id,
      seniorName: "Frank Delgado",
      seniorAge: 82,
      relationship: "Father",
      summary: "Hospital discharge within 48 hours. Assisted living with short-term rehab support.",
      executiveSummary:
        "Frank Delgado is an 82-year-old gentleman referred by hospital discharge planning for assisted living with short-term rehab support after hip fracture recovery. All required identity, medical, financial, and legal documents were verified before submission. He needs medication management and fall-risk precautions. The family is requesting placement within two days. Clinical notes indicate stable hypertension and an otherwise clear care picture for assisted living.",
      careNeeds: ["Post-acute rehab", "Medication management", "Fall risk precautions"],
      medicalHighlights: ["Hip fracture recovery", "Hypertension"],
      insights: {
        primaryDiagnoses: ["Hip fracture recovery", "Hypertension"],
        mobilityLevel: "Walker outdoors · standby assist for transfers",
        cognitiveStatus: "Alert and oriented · no dementia diagnosis",
        importantMedications: ["Amlodipine 5mg daily", "Acetaminophen as needed"],
        allergies: ["None reported"],
        specialConsiderations: ["Hospital discharge within 48 hours", "Fall risk precautions"],
      },
      dossier: {
        dateOfBirth: "1943-09-12",
        gender: "Male",
        primaryLanguage: "English · Spanish",
        maritalStatus: "Widowed",
        height: "5'9\"",
        weight: "168 lb",
        bloodType: "O+",
        currentAddress: "Dell Seton Medical Center · Austin, TX",
        currentLivingSituation: "Hospital inpatient · discharge planned within 48h",
        primaryPhysician: "Dr. Rachel Kim, Orthopedics",
        physicianPhone: "(512) 555-2201",
        pharmacy: "CVS Pharmacy · West 38th St",
        insurancePrimary: "Medicare Part A/B",
        insuranceSecondary: "AARP UnitedHealthcare supplement",
        pathologies: [
          { name: "Left hip fracture (ORIF)", status: "active", diagnosedYear: "2026", notes: "Post-op day 6" },
          { name: "Essential hypertension", status: "active", diagnosedYear: "2012" },
          { name: "Osteoporosis", status: "active", diagnosedYear: "2019" },
          { name: "Vitamin D deficiency", status: "active", diagnosedYear: "2024" },
          { name: "Appendectomy", status: "history", diagnosedYear: "1988", notes: "Resolved" },
        ],
        medications: [
          { name: "Amlodipine", dose: "5 mg", frequency: "Once daily morning", route: "Oral", indication: "Hypertension", prescribedBy: "Dr. Kim" },
          { name: "Acetaminophen", dose: "650 mg", frequency: "Every 6h as needed", route: "Oral", indication: "Pain" },
          { name: "Oxycodone", dose: "5 mg", frequency: "Every 6h as needed", route: "Oral", indication: "Breakthrough pain", prescribedBy: "Dr. Kim" },
          { name: "Enoxaparin", dose: "40 mg", frequency: "Once daily", route: "Subcutaneous", indication: "DVT prophylaxis" },
          { name: "Cholecalciferol (Vit D3)", dose: "2000 IU", frequency: "Once daily", route: "Oral", indication: "Deficiency" },
          { name: "Calcium carbonate", dose: "600 mg", frequency: "Twice daily", route: "Oral", indication: "Bone health" },
          { name: "Senna", dose: "8.6 mg", frequency: "At bedtime as needed", route: "Oral", indication: "Constipation" },
        ],
        allergies: [{ substance: "None known", reaction: ",", severity: "NKA" }],
        previousFacilities: [
          {
            name: "Dell Seton Medical Center",
            type: "Hospital · acute care",
            from: "2026-04-10",
            to: "Present",
            reasonForLeaving: "Discharge to assisted living with rehab",
          },
          {
            name: "Home with daughter (Elena)",
            type: "Private residence",
            from: "2021",
            to: "2026-04-10",
            reasonForLeaving: "Fall at home resulting in hip fracture",
          },
          {
            name: "Sunrise of Northwest Hills",
            type: "Independent living",
            from: "2018",
            to: "2021",
            reasonForLeaving: "Moved in with family for support",
          },
        ],
        hospitalizations: [
          "Apr 2026, Hip fracture ORIF · Dell Seton",
          "2019, Syncope workup · St. David’s (overnight)",
        ],
        surgeries: ["2026, Left hip ORIF", "1988, Appendectomy"],
        vaccinations: ["Influenza Oct 2025", "COVID booster Sep 2025", "Pneumococcal 2023", "Shingles 2022"],
        adls: [
          { activity: "Bathing", level: "Standby assist" },
          { activity: "Dressing", level: "Minimal assist (lower body)" },
          { activity: "Toileting", level: "Independent with raised seat" },
          { activity: "Transfers", level: "Standby / contact guard" },
          { activity: "Eating", level: "Independent" },
          { activity: "Medication management", level: "Needs setup & reminders" },
        ],
        mobilityAids: ["Front-wheeled walker", "Raised toilet seat", "Grab bars recommended"],
        diet: "Regular · high protein for healing · encourage fluids",
        continence: "Continent · occasional nocturia",
        cognitiveNotes: "Alert and oriented ×3. No dementia diagnosis. Mild fatigue post-op.",
        behaviors: ["Cooperative with staff", "Motivated for PT"],
        hearingVision: "Hearing aids bilateral · glasses for reading",
        codeStatus: "Full code",
        advanceDirectives: "Healthcare proxy on file (Elena Delgado)",
        fallHistory: "1 fall Apr 2026 (index event) · no prior falls in 12 months",
        smokingAlcohol: "Never smoker · rare alcohol",
        socialSupports: "Daughter Elena daily · son in Dallas visits monthly",
      },
      documents: [
        {
          id: "du1",
          name: "Discharge summary",
          category: "Medical",
          shared: true,
          aiSummary: "Post-op hip recovery; recommends assisted living with rehab support.",
        },
        {
          id: "du2",
          name: "Insurance card",
          category: "Financial",
          shared: true,
          aiSummary: "Active private insurance with Medicare Part A/B.",
        },
        {
          id: "du3",
          name: "Physician orders",
          category: "Medical",
          shared: true,
          aiSummary: "Orders for PT follow-up and fall precautions after discharge.",
        },
        {
          id: "du4",
          name: "Photo ID",
          category: "Identity",
          shared: true,
          aiSummary: "Government ID matches applicant name and date of birth.",
        },
      ],
      family: {
        name: "Elena Delgado",
        email: "elena.delgado@example.com",
        phone: "(512) 555-0188",
        relationship: "Daughter · primary contact",
      },
      emergencyContact: {
        name: "Elena Delgado",
        phone: "(512) 555-0188",
        relationship: "Daughter",
      },
      paymentMethod: "Private pay + Medicare",
      moveInRequested: "2026-04-18",
      status: "received",
      careType: "Assisted living",
      referralSource: "Hospital",
      priority: "high",
      assigneeId: null,
      assigneeName: null,
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-04-16T07:00:00.000Z",
      lastUpdated: "2026-04-16T07:15:00.000Z",
      auditLog: [
        audit("System", "Application submitted"),
        audit("System", "Documents verified"),
        audit("Haven", "Application marked complete · ready for review"),
      ],
    },
    {
      id: "capp-1",
      residenceId: r.id,
      seniorName: "Eleanor Martin",
      seniorAge: 84,
      relationship: "Mother",
      summary:
        "Assisted living with light memory support. Family seeking move-in within 60 days.",
      executiveSummary:
        "Eleanor Martin is an 84-year-old woman applying for assisted living with light cognitive support. Her daughter Claire is the primary contact. The application is complete: identity, insurance, medication list, and physician letter are all verified. Eleanor manages hypertension and osteoarthritis, with mild cognitive impairment that does not currently require secure memory care. The family prefers a garden suite and can move within about two months.",
      careNeeds: [
        "Medication management",
        "Standby assist for transfers",
        "Mild cognitive support",
        "Social engagement programs",
      ],
      medicalHighlights: ["Hypertension", "Osteoarthritis", "Mild cognitive impairment"],
      insights: {
        primaryDiagnoses: ["Hypertension", "Osteoarthritis", "Mild cognitive impairment"],
        mobilityLevel: "Independent indoors · walker outdoors",
        cognitiveStatus: "Mild impairment · no wandering history",
        importantMedications: ["Amlodipine 5mg morning", "Donepezil 5mg evening"],
        allergies: ["Penicillin, rash"],
        specialConsiderations: ["Prefers garden suite", "Benefits from structured social programs"],
      },
      dossier: {
        dateOfBirth: "1941-04-12",
        gender: "Female",
        primaryLanguage: "English · French",
        maritalStatus: "Widowed",
        height: "5'4\"",
        weight: "132 lb",
        bloodType: "A+",
        currentAddress: "42 Maple Avenue, Austin, TX 78731",
        currentLivingSituation: "Lives alone in condo · daughter nearby",
        primaryPhysician: "Dr. Amélie Caron, Internal medicine",
        physicianPhone: "(512) 555-0190",
        pharmacy: "Walgreens · Burnet Rd",
        insurancePrimary: "Blue Cross Blue Shield PPO",
        insuranceSecondary: "Medicare Part A/B",
        pathologies: [
          { name: "Mild cognitive impairment", status: "active", diagnosedYear: "2023", notes: "MMSE 24/30 · no wandering" },
          { name: "Essential hypertension", status: "active", diagnosedYear: "2008" },
          { name: "Osteoarthritis (knees, hands)", status: "active", diagnosedYear: "2015" },
          { name: "Hyperlipidemia", status: "active", diagnosedYear: "2010" },
          { name: "History of UTI", status: "history", diagnosedYear: "2024" },
        ],
        medications: [
          { name: "Amlodipine", dose: "5 mg", frequency: "Once daily morning", route: "Oral", indication: "Hypertension" },
          { name: "Donepezil", dose: "5 mg", frequency: "Once daily evening", route: "Oral", indication: "MCI", prescribedBy: "Neurology" },
          { name: "Atorvastatin", dose: "20 mg", frequency: "Once daily evening", route: "Oral", indication: "Hyperlipidemia" },
          { name: "Acetaminophen", dose: "500 mg", frequency: "Twice daily as needed", route: "Oral", indication: "Joint pain" },
          { name: "Vitamin D3", dose: "1000 IU", frequency: "Once daily", route: "Oral" },
          { name: "Calcium + magnesium", dose: "500 mg", frequency: "Once daily", route: "Oral" },
          { name: "Artificial tears", dose: "1 drop", frequency: "Twice daily", route: "Ophthalmic", indication: "Dry eyes" },
        ],
        allergies: [
          { substance: "Penicillin", reaction: "Rash / hives", severity: "Moderate" },
          { substance: "Sulfa drugs", reaction: "Itching", severity: "Mild" },
        ],
        previousFacilities: [
          {
            name: "Home, Maple Avenue condo",
            type: "Private residence",
            from: "2005",
            to: "Present",
            reasonForLeaving: "Seeking assisted living for safety & social support",
          },
          {
            name: "The Carlyle Senior Living (respite stay)",
            type: "Assisted living · respite",
            from: "2024-11",
            to: "2024-12",
            reasonForLeaving: "2-week respite while daughter traveled, completed successfully",
          },
        ],
        hospitalizations: ["None in the last 24 months"],
        surgeries: ["2016, Right knee arthroscopy", "2001, Cholecystectomy"],
        vaccinations: ["Influenza Oct 2025", "COVID booster Aug 2025", "Shingles 2021", "Tdap 2020"],
        adls: [
          { activity: "Bathing", level: "Independent with grab bars" },
          { activity: "Dressing", level: "Independent · occasional cueing for weather-appropriate clothing" },
          { activity: "Toileting", level: "Independent" },
          { activity: "Transfers", level: "Independent" },
          { activity: "Eating", level: "Independent" },
          { activity: "Medication management", level: "Weekly pillbox setup by daughter" },
          { activity: "Meal prep", level: "Light meals · prefers community dining" },
        ],
        mobilityAids: ["Foldable walker for outdoors / uneven ground"],
        diet: "Regular · low sodium preferred · no texture modification",
        continence: "Continent",
        cognitiveNotes: "Mild short-term memory difficulty. Remembers familiar people and routines. No sundowning reported.",
        behaviors: ["Pleasant · socially engaged", "Anxious if rushed in the morning"],
        hearingVision: "Glasses for distance and reading · hearing screen normal 2025",
        codeStatus: "Full code",
        advanceDirectives: "Living will + POA (Claire Martin)",
        fallHistory: "No falls in past 12 months · near-fall outdoors Mar 2026",
        smokingAlcohol: "Never smoker · occasional wine",
        socialSupports: "Daughter Claire (primary) · son David · bridge club weekly",
      },
      documents: [
        {
          id: "d1",
          name: "Photo ID",
          category: "Identity",
          shared: true,
          aiSummary: "Valid photo ID for Eleanor Martin.",
        },
        {
          id: "d2",
          name: "Insurance card",
          category: "Financial",
          shared: true,
          aiSummary: "Private insurance with supplemental coverage.",
        },
        {
          id: "d3",
          name: "Medication list",
          category: "Medical",
          shared: true,
          aiSummary: "Two daily medications; no high-risk interactions flagged.",
        },
        {
          id: "d4",
          name: "Doctor’s letter",
          category: "Medical",
          shared: true,
          aiSummary: "Physician supports assisted living with light cognitive support.",
        },
        {
          id: "d4b",
          name: "Power of attorney",
          category: "Legal",
          shared: true,
          aiSummary: "Daughter Claire Martin named as primary agent.",
        },
      ],
      family: {
        name: "Claire Martin",
        email: "family@demo.haven",
        phone: "(512) 555-0142",
        relationship: "Daughter · primary contact",
      },
      emergencyContact: {
        name: "David Martin",
        phone: "(512) 555-0143",
        relationship: "Son",
      },
      paymentMethod: "Private pay",
      moveInRequested: "2026-06-01",
      status: "received",
      careType: "Assisted living",
      referralSource: "Family",
      priority: "medium",
      assigneeId: null,
      assigneeName: null,
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-04-14T15:20:00.000Z",
      lastUpdated: "2026-04-14T15:20:00.000Z",
      auditLog: [
        audit("System", "Application submitted"),
        audit("System", "Documents verified"),
        audit("Haven", "Application marked complete · ready for review"),
      ],
    },
    {
      id: "capp-2",
      residenceId: r.id,
      seniorName: "Robert Chen",
      seniorAge: 79,
      relationship: "Father",
      summary: "Memory care evaluation for moderate Alzheimer’s. Application complete.",
      executiveSummary:
        "Robert Chen is a 79-year-old man applying for secure memory care. His daughter Amy submitted a complete packet including neurology notes, POA, identity, and insurance. He has moderate Alzheimer’s with wandering risk and managed type 2 diabetes. The family is flexible on timing but wants a secure memory unit with cueing for ADLs.",
      careNeeds: ["Secure memory care", "Wandering risk monitoring", "Cueing for ADLs"],
      medicalHighlights: ["Alzheimer’s disease (moderate)", "Type 2 diabetes"],
      insights: {
        primaryDiagnoses: ["Alzheimer’s disease (moderate)", "Type 2 diabetes"],
        mobilityLevel: "Independent ambulation with supervision outdoors",
        cognitiveStatus: "Moderate dementia · nighttime wandering risk",
        importantMedications: ["Donepezil 10mg", "Metformin 500mg twice daily"],
        allergies: ["None reported"],
        specialConsiderations: ["Requires secure memory setting", "Benefits from consistent caregivers"],
      },
      dossier: {
        dateOfBirth: "1946-11-03",
        gender: "Male",
        primaryLanguage: "English · Mandarin",
        maritalStatus: "Married (wife in memory care elsewhere)",
        height: "5'7\"",
        weight: "154 lb",
        bloodType: "B+",
        currentAddress: "8910 Spicewood Springs Rd, Austin, TX",
        currentLivingSituation: "Home with daughter Amy · unsafe alone",
        primaryPhysician: "Dr. Priya Nair, Geriatrics",
        physicianPhone: "(512) 555-0330",
        pharmacy: "HEB Pharmacy · Far West",
        insurancePrimary: "Medicare Advantage, Humana",
        insuranceSecondary: "None",
        pathologies: [
          { name: "Alzheimer’s disease (moderate)", status: "active", diagnosedYear: "2021", notes: "MoCA 14/30 · progressive" },
          { name: "Type 2 diabetes mellitus", status: "active", diagnosedYear: "2014", notes: "A1c 7.1%" },
          { name: "Hypertension", status: "active", diagnosedYear: "2009" },
          { name: "Insomnia / sundowning", status: "active", diagnosedYear: "2024" },
          { name: "Benign prostatic hyperplasia", status: "active", diagnosedYear: "2017" },
        ],
        medications: [
          { name: "Donepezil", dose: "10 mg", frequency: "Once daily evening", route: "Oral", indication: "Alzheimer’s", prescribedBy: "Neurology" },
          { name: "Memantine", dose: "10 mg", frequency: "Twice daily", route: "Oral", indication: "Alzheimer’s" },
          { name: "Metformin", dose: "500 mg", frequency: "Twice daily with meals", route: "Oral", indication: "Diabetes" },
          { name: "Lisinopril", dose: "10 mg", frequency: "Once daily", route: "Oral", indication: "Hypertension" },
          { name: "Tamsulosin", dose: "0.4 mg", frequency: "Once daily", route: "Oral", indication: "BPH" },
          { name: "Melatonin", dose: "3 mg", frequency: "At bedtime", route: "Oral", indication: "Sleep" },
          { name: "Vitamin B12", dose: "1000 mcg", frequency: "Once daily", route: "Oral" },
          { name: "Aspirin", dose: "81 mg", frequency: "Once daily", route: "Oral", indication: "CV prevention" },
        ],
        allergies: [{ substance: "None known", reaction: ",", severity: "NKA" }],
        previousFacilities: [
          {
            name: "Home with daughter Amy",
            type: "Private residence",
            from: "2023",
            to: "Present",
            reasonForLeaving: "Wandering risk · caregiver burnout",
          },
          {
            name: "Daybreak Adult Day Program",
            type: "Adult day care",
            from: "2024",
            to: "Present",
            reasonForLeaving: "Still attending 3 days/week until move-in",
          },
          {
            name: "Seton Northwest Hospital",
            type: "Hospital · observation",
            from: "2025-08",
            to: "2025-08",
            reasonForLeaving: "Confusion episode · returned home",
          },
        ],
        hospitalizations: ["Aug 2025, Acute confusion observation · Seton Northwest"],
        surgeries: ["2011, Cataract surgery (bilateral)", "2005, Hernia repair"],
        vaccinations: ["Influenza Oct 2025", "COVID booster Jul 2025", "Pneumococcal 2022"],
        adls: [
          { activity: "Bathing", level: "Full assist · resists at times" },
          { activity: "Dressing", level: "Cueing + partial assist" },
          { activity: "Toileting", level: "Reminders · occasional incontinence" },
          { activity: "Transfers", level: "Independent" },
          { activity: "Eating", level: "Independent · may skip meals without cueing" },
          { activity: "Medication management", level: "Full assist required" },
        ],
        mobilityAids: ["None indoors · supervision outdoors"],
        diet: "Diabetic · carb-controlled · no concentrated sweets",
        continence: "Occasional urinary incontinence · scheduled toileting helps",
        cognitiveNotes: "Moderate Alzheimer’s. Recognizes daughter. Nighttime wandering 2–3×/week. Exit-seeking if doors unlocked.",
        behaviors: ["Sundowning after 5pm", "Repeats questions", "Can become agitated if corrected harshly"],
        hearingVision: "Post-cataract vision good · mild hearing loss left ear",
        codeStatus: "DNR / DNI per family discussion (documented)",
        advanceDirectives: "POA healthcare + financial: Amy Chen",
        fallHistory: "No falls in 6 months · unsupervised outdoor risk high",
        smokingAlcohol: "Former smoker (quit 1998) · no alcohol",
        socialSupports: "Daughter Amy primary · adult day program peers",
      },
      documents: [
        {
          id: "d5",
          name: "Photo ID",
          category: "Identity",
          shared: true,
          aiSummary: "Valid ID matching applicant details.",
        },
        {
          id: "d6",
          name: "Neurology summary",
          category: "Medical",
          shared: true,
          aiSummary: "Moderate Alzheimer’s; recommends secure memory care.",
        },
        {
          id: "d7",
          name: "Power of attorney",
          category: "Legal",
          shared: true,
          aiSummary: "Amy Chen appointed as healthcare and financial agent.",
        },
        {
          id: "d7b",
          name: "Insurance card",
          category: "Financial",
          shared: true,
          aiSummary: "Active coverage suitable for memory care private pay.",
        },
      ],
      family: {
        name: "Amy Chen",
        email: "amy.chen@example.com",
        phone: "(512) 555-0199",
        relationship: "Daughter · primary contact",
      },
      emergencyContact: {
        name: "Amy Chen",
        phone: "(512) 555-0199",
        relationship: "Daughter",
      },
      paymentMethod: "Private pay",
      moveInRequested: "2026-05-15",
      status: "received",
      careType: "Memory care",
      referralSource: "Family",
      priority: "medium",
      assigneeId: null,
      assigneeName: null,
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-04-08T10:00:00.000Z",
      lastUpdated: "2026-04-08T10:00:00.000Z",
      auditLog: [
        audit("System", "Application submitted"),
        audit("System", "Documents verified"),
        audit("Haven", "Application marked complete · ready for review"),
      ],
    },
    {
      id: "capp-5",
      residenceId: r.id,
      seniorName: "Dorothy Walsh",
      seniorAge: 86,
      relationship: "Mother",
      summary: "Assisted living with flexible timing. Referred by a social worker.",
      executiveSummary:
        "Dorothy Walsh is an 86-year-old woman referred by a social worker for assisted living. Her son Tom is the primary contact. The packet is complete and clinically straightforward: well-managed hypertension, interest in social programming, and a flexible move-in window later this year.",
      careNeeds: ["Assisted living", "Social programming"],
      medicalHighlights: ["Well-managed hypertension"],
      insights: {
        primaryDiagnoses: ["Hypertension (well managed)"],
        mobilityLevel: "Independent with cane outdoors",
        cognitiveStatus: "Intact · no cognitive concerns noted",
        importantMedications: ["Lisinopril 10mg daily"],
        allergies: ["None reported"],
        specialConsiderations: ["Flexible move-in timing", "Values community activities"],
      },
      dossier: {
        dateOfBirth: "1939-07-22",
        gender: "Female",
        primaryLanguage: "English",
        maritalStatus: "Widowed",
        height: "5'2\"",
        weight: "118 lb",
        bloodType: "A-",
        currentAddress: "2200 Westover Rd, Austin, TX 78703",
        currentLivingSituation: "Lives alone in townhome · weekly housekeeper",
        primaryPhysician: "Dr. Samuel Ortiz, Family medicine",
        physicianPhone: "(512) 555-0444",
        pharmacy: "Randalls Pharmacy",
        insurancePrimary: "Medicare + Medigap Plan G",
        insuranceSecondary: "None",
        pathologies: [
          { name: "Essential hypertension", status: "active", diagnosedYear: "2005", notes: "Well controlled" },
          { name: "Osteopenia", status: "active", diagnosedYear: "2018" },
          { name: "Seasonal allergies", status: "active" },
          { name: "Hypothyroidism", status: "resolved", diagnosedYear: "2010", notes: "Off levothyroxine since 2019" },
        ],
        medications: [
          { name: "Lisinopril", dose: "10 mg", frequency: "Once daily morning", route: "Oral", indication: "Hypertension" },
          { name: "Alendronate", dose: "70 mg", frequency: "Once weekly", route: "Oral", indication: "Osteopenia" },
          { name: "Vitamin D3", dose: "2000 IU", frequency: "Once daily", route: "Oral" },
          { name: "Loratadine", dose: "10 mg", frequency: "As needed spring/fall", route: "Oral", indication: "Allergies" },
          { name: "Multivitamin", dose: "1 tablet", frequency: "Once daily", route: "Oral" },
        ],
        allergies: [
          { substance: "Codeine", reaction: "Nausea", severity: "Mild" },
        ],
        previousFacilities: [
          {
            name: "Home, Westover townhome",
            type: "Private residence",
            from: "1995",
            to: "Present",
            reasonForLeaving: "Planning proactive move for socialization & light support",
          },
          {
            name: "Longhorn Village (tour / waitlist inquiry only)",
            type: "CCRC · inquiry",
            from: "2025",
            to: "2025",
            reasonForLeaving: "Chose not to proceed · preferred smaller community",
          },
        ],
        hospitalizations: ["None in the last 5 years"],
        surgeries: ["2003, Cataract (right eye)", "1992, Hysterectomy"],
        vaccinations: ["Influenza Oct 2025", "COVID booster Jan 2026", "Shingles 2019", "Pneumococcal 2018"],
        adls: [
          { activity: "Bathing", level: "Independent" },
          { activity: "Dressing", level: "Independent" },
          { activity: "Toileting", level: "Independent" },
          { activity: "Transfers", level: "Independent" },
          { activity: "Eating", level: "Independent" },
          { activity: "Medication management", level: "Independent with weekly organizer" },
        ],
        mobilityAids: ["Single-point cane outdoors"],
        diet: "Regular · prefers lighter dinners",
        continence: "Continent",
        cognitiveNotes: "Intact cognition. Manages finances and appointments independently.",
        behaviors: ["Outgoing · enjoys group activities", "No behavioral concerns"],
        hearingVision: "Glasses · mild bilateral hearing loss (no aids yet)",
        codeStatus: "Full code",
        advanceDirectives: "Healthcare proxy: Tom Walsh",
        fallHistory: "No falls in past 24 months",
        smokingAlcohol: "Never smoker · no alcohol",
        socialSupports: "Son Tom · church group · neighbors check weekly",
      },
      documents: [
        {
          id: "d13",
          name: "Photo ID",
          category: "Identity",
          shared: true,
          aiSummary: "Valid photo identification.",
        },
        {
          id: "d14",
          name: "Insurance card",
          category: "Financial",
          shared: true,
          aiSummary: "Active Medicare with supplemental plan.",
        },
        {
          id: "d15",
          name: "Physician letter",
          category: "Medical",
          shared: true,
          aiSummary: "Supports assisted living; no skilled nursing needs.",
        },
        {
          id: "d16",
          name: "Healthcare proxy",
          category: "Legal",
          shared: true,
          aiSummary: "Tom Walsh named as healthcare proxy.",
        },
      ],
      family: {
        name: "Tom Walsh",
        email: "tom.walsh@example.com",
        phone: "(512) 555-0133",
        relationship: "Son · primary contact",
      },
      emergencyContact: {
        name: "Tom Walsh",
        phone: "(512) 555-0133",
        relationship: "Son",
      },
      paymentMethod: "Private pay",
      moveInRequested: "2026-09-01",
      status: "submitted",
      careType: "Assisted living",
      referralSource: "Social Worker",
      priority: "low",
      assigneeId: null,
      assigneeName: null,
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-04-16T08:30:00.000Z",
      lastUpdated: "2026-04-16T08:30:00.000Z",
      auditLog: [
        audit("System", "Application submitted"),
        audit("System", "Documents verified"),
        audit("Haven", "Application marked complete · ready for review"),
      ],
    },
  ];

  // Past candidates (accepted / declined), visible in History, not the live queue
  const historyDossier: ClientDossier = {
    dateOfBirth: "1940-01-01",
    gender: "Female",
    primaryLanguage: "English",
    currentLivingSituation: "Private home with family support",
    pathologies: [{ name: "Hypertension", status: "active", diagnosedYear: "2015" }],
    medications: [
      {
        name: "Lisinopril",
        dose: "10 mg",
        frequency: "Once daily",
        route: "Oral",
        indication: "Hypertension",
      },
    ],
    allergies: [{ substance: "None known", reaction: "—" }],
    previousFacilities: [],
  };

  applications.push(
    {
      id: "capp-hist-accepted",
      residenceId: r.id,
      seniorName: "Helen Brooks",
      seniorAge: 87,
      relationship: "Mother",
      summary: "Assisted living application, accepted after tour and clinical review.",
      executiveSummary:
        "Helen Brooks was accepted for assisted living following a complete packet review and family tour.",
      careNeeds: ["Assisted living", "Medication management"],
      medicalHighlights: ["Hypertension"],
      insights: {
        primaryDiagnoses: ["Hypertension"],
        mobilityLevel: "Walker for distances",
        cognitiveStatus: "Intact",
        importantMedications: ["Lisinopril 10mg"],
        allergies: ["None known"],
        specialConsiderations: ["Daughter nearby for weekly visits"],
      },
      dossier: {
        ...historyDossier,
        dateOfBirth: "1938-06-14",
        gender: "Female",
      },
      documents: [
        {
          id: "dh1",
          name: "Photo ID",
          category: "Identity",
          shared: true,
          aiSummary: "Valid identification.",
        },
      ],
      family: {
        name: "Rachel Brooks",
        email: "rachel.brooks@example.com",
        phone: "(512) 555-0144",
        relationship: "Daughter · primary contact",
      },
      emergencyContact: {
        name: "Rachel Brooks",
        phone: "(512) 555-0144",
        relationship: "Daughter",
      },
      paymentMethod: "Private pay",
      moveInRequested: "2026-03-01",
      moveInConfirmed: null,
      status: "approved",
      careType: "Assisted living",
      referralSource: "Family",
      priority: "medium",
      assigneeId: "tm-jordan",
      assigneeName: "Jordan Lee",
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-02-10T14:00:00.000Z",
      lastUpdated: "2026-02-18T16:30:00.000Z",
      reviewChecklist: {
        identity: true,
        clinical: true,
        medications: true,
        documents: true,
        family: true,
        fit: true,
      },
      transitionChecklist: {
        contract: true,
        payment: false,
        familyDetails: false,
        moveInDate: false,
      },
      auditLog: [
        audit("System", "Application submitted"),
        audit("Jordan Lee", "Tour completed"),
        audit("Jordan Lee", "Accepted · room hold confirmed"),
        audit("Jordan Lee", "Transition · residency agreement signed"),
      ],
    },
    {
      id: "capp-hist-declined",
      residenceId: r.id,
      seniorName: "Frank Nguyen",
      seniorAge: 79,
      relationship: "Father",
      summary: "Memory care inquiry, declined; care needs above current program capacity.",
      executiveSummary:
        "Frank Nguyen’s application was declined after clinical review determined a higher acuity level than the community can support.",
      careNeeds: ["Memory care", "Two-person transfers"],
      medicalHighlights: ["Advanced dementia", "High fall risk"],
      insights: {
        primaryDiagnoses: ["Advanced dementia"],
        mobilityLevel: "Two-person assist",
        cognitiveStatus: "Advanced impairment · exit-seeking",
        importantMedications: ["Donepezil 10mg", "Quetiapine 25mg PRN"],
        allergies: ["None known"],
        specialConsiderations: ["Needs secure unit and higher staffing ratio"],
      },
      dossier: {
        ...historyDossier,
        dateOfBirth: "1946-11-02",
        gender: "Male",
        pathologies: [
          { name: "Advanced dementia", status: "active", diagnosedYear: "2020" },
          { name: "High fall risk", status: "active", diagnosedYear: "2025" },
        ],
      },
      documents: [
        {
          id: "dh2",
          name: "Physician report",
          category: "Medical",
          shared: true,
          aiSummary: "Documents advanced cognitive needs.",
        },
      ],
      family: {
        name: "Linh Nguyen",
        email: "linh.nguyen@example.com",
        phone: "(512) 555-0177",
        relationship: "Daughter · primary contact",
      },
      emergencyContact: {
        name: "Linh Nguyen",
        phone: "(512) 555-0177",
        relationship: "Daughter",
      },
      paymentMethod: "Private pay",
      moveInRequested: "2026-02-20",
      status: "declined",
      careType: "Memory care",
      referralSource: "Hospital",
      priority: "high",
      assigneeId: "tm-sofia",
      assigneeName: "Sofia Nguyen",
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-02-05T11:00:00.000Z",
      lastUpdated: "2026-02-12T09:45:00.000Z",
      auditLog: [
        audit("System", "Application submitted"),
        audit("Sofia Nguyen", "Clinical review completed"),
        audit("Sofia Nguyen", "Declined · care needs exceed program capacity"),
      ],
    },
  );

  const availability: AvailabilityUnit[] = [
    {
      id: "av-1",
      roomType: "Private suite",
      count: 2,
      availableDate: "2026-05-01",
      price: 4800,
      careLevel: "Assisted living",
      status: "confirmed",
      waitlistCount: 1,
    },
    {
      id: "av-2",
      roomType: "Shared room",
      count: 1,
      availableDate: "2026-04-22",
      price: 3600,
      careLevel: "Assisted living",
      status: "confirmed",
      waitlistCount: 0,
    },
    {
      id: "av-3",
      roomType: "Memory care private",
      count: 0,
      availableDate: "2026-06-15",
      price: 6200,
      careLevel: "Memory care",
      status: "estimated",
      waitlistCount: 4,
    },
  ];

  const openBeds = availability.reduce((s, u) => s + u.count, 0);
  const waitlistTotal = availability.reduce((s, u) => s + u.waitlistCount, 0);

  return {
    residenceId: r.id,
    residenceName: r.name,
    profile: {
      residenceId: r.id,
      name: r.name,
      description: r.about,
      photos: [r.image, ...r.gallery].slice(0, 6),
      address: detail.streetAddress,
      city: r.city,
      state: r.state,
      zip: r.zip,
      phone: detail.phone,
      email: detail.email,
      careTypes: [...r.careLevels],
      amenities: [...r.amenities],
      services: [...r.includedServices],
      admissionCriteria: [...detail.admission.residencyCriteria],
      notAccepted: [...detail.admission.notAccepted],
      requiredDocuments: [...detail.admission.documents],
      roomTypes: r.pricing.map((p, i) => ({
        name: p.room,
        price: p.price,
        notes: p.notes,
        availableUnits: i === 0 ? 2 : i === 1 ? 1 : 0,
      })),
      promotions: "Spring move-in credit: first community fee waived for May admissions.",
      waitlistNotes: "Memory care waitlist currently ~4–6 weeks for private suites.",
      admissionFlags: {
        medicaid: r.acceptsMedicaid,
        privatePay: true,
        pets: r.petFriendly,
        smoking: "Outdoor only",
        minAge: 65,
        notes: "Clinical review required for memory care.",
      },
    },
    availability,
    applications,
    patientTransfers: [],
    team,
    notifications: [],
    auditLog: [
      audit("System", `Workspace opened for ${r.name}`),
      audit("Jordan Lee", "Synced community profile from Haven listing"),
    ],
    metrics: {
      conversionRate: 28,
      avgResponseHours: 6.5,
      openBeds,
      waitlistTotal,
    },
    updatedAt: now,
  };
}

export type DashboardStats = {
  newApplications: number;
  pendingReview: number;
  documentRequests: number;
  upcomingVisits: number;
  assessmentsToSchedule: number;
  openBeds: number;
  waitlistTotal: number;
  conversionRate: number;
  avgResponseHours: number;
};

export function computeDashboardStats(ws: CommunityWorkspace): DashboardStats {
  const apps = ws.applications;
  return {
    newApplications: apps.filter((a) =>
      ["submitted", "received"].includes(a.status),
    ).length,
    pendingReview: apps.filter((a) =>
      ["under_review", "received", "submitted", "more_info"].includes(a.status),
    ).length,
    documentRequests: apps.filter((a) => Boolean(a.documentRequest)).length,
    upcomingVisits: apps.filter((a) => Boolean(a.tourProposal)).length,
    assessmentsToSchedule: apps.filter(
      (a) => a.status === "assessment_requested" || Boolean(a.assessmentProposal),
    ).length,
    openBeds: ws.metrics.openBeds,
    waitlistTotal: ws.metrics.waitlistTotal,
    conversionRate: ws.metrics.conversionRate,
    avgResponseHours: ws.metrics.avgResponseHours,
  };
}
