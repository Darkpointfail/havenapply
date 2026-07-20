/** Community partner portal — roles, applications, availability, profile, audit */

import type { ApplicationStatus } from "@/data/applications";
import { STATUS_META } from "@/data/applications";
import { getResidence } from "@/data/residences";
import { buildCommunityDetail } from "@/lib/residence-detail";
import { residencesForCommunityOrg } from "@/lib/messaging";

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
    label: "Community administrator",
    description: "Full control of profile, team, pricing, and admissions.",
  },
  {
    id: "admissions_manager",
    label: "Admissions manager",
    description: "Own the pipeline — assign, decide, request docs, schedule visits.",
  },
  {
    id: "sales_counselor",
    label: "Sales counselor",
    description: "Work prospects, propose tours, add notes, update non-final status.",
  },
  {
    id: "nurse_reviewer",
    label: "Nurse reviewer",
    description: "Review care needs and clinical documents; request medical info.",
  },
  {
    id: "readonly",
    label: "Read-only user",
    description: "View dashboard and applications without making changes.",
  },
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
};

export type CommunityApplication = {
  id: string;
  residenceId: string;
  seniorName: string;
  seniorAge: number;
  relationship: string;
  summary: string;
  careNeeds: string[];
  medicalHighlights: string[];
  documents: SharedDocument[];
  family: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  };
  status: ApplicationStatus;
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
};

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
  roomTypes: { name: string; price: number | null; notes: string }[];
  promotions: string;
  waitlistNotes: string;
};

export type CommunityTeamMember = {
  id: string;
  name: string;
  email: string;
  role: CommunityTeamRole;
  status: "active" | "invited";
  jobTitle: string;
};

export type CommunityWorkspace = {
  residenceId: string;
  residenceName: string;
  profile: CommunityProfile;
  availability: AvailabilityUnit[];
  applications: CommunityApplication[];
  team: CommunityTeamMember[];
  auditLog: AuditEntry[];
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

export function resolveCommunityResidenceId(
  organization?: string,
  email?: string,
): string {
  const ids = residencesForCommunityOrg(organization, email);
  return ids[0] || "maple-grove";
}

export function seedCommunityWorkspace(residenceId: string): CommunityWorkspace {
  const r = getResidence(residenceId) || getResidence("maple-grove")!;
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
      id: "capp-1",
      residenceId: r.id,
      seniorName: "Eleanor Martin",
      seniorAge: 84,
      relationship: "Mother",
      summary:
        "Assisted living with light memory support. Family seeking move-in within 60 days. Strong preference for garden suite.",
      careNeeds: [
        "Medication management",
        "Standby assist for transfers",
        "Mild cognitive support",
        "Social engagement programs",
      ],
      medicalHighlights: ["Hypertension", "Osteoarthritis", "Mild cognitive impairment"],
      documents: [
        { id: "d1", name: "Photo ID", category: "Identity", shared: true },
        { id: "d2", name: "Insurance card", category: "Insurance", shared: true },
        { id: "d3", name: "Medication list", category: "Clinical", shared: true },
        { id: "d4", name: "Doctor’s letter", category: "Clinical", shared: false },
      ],
      family: {
        name: "Claire Martin",
        email: "family@demo.haven",
        phone: "(512) 555-0142",
        relationship: "Daughter · primary contact",
      },
      status: "received",
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
      auditLog: [audit("System", "Application received from Haven")],
    },
    {
      id: "capp-2",
      residenceId: r.id,
      seniorName: "Robert Chen",
      seniorAge: 79,
      relationship: "Father",
      summary: "Memory care evaluation. Family touring this week. Documents partly complete.",
      careNeeds: ["Secure memory care", "Wandering risk monitoring", "Cueing for ADLs"],
      medicalHighlights: ["Alzheimer’s disease (moderate)", "Type 2 diabetes"],
      documents: [
        { id: "d5", name: "Photo ID", category: "Identity", shared: true },
        { id: "d6", name: "Neurology summary", category: "Clinical", shared: true },
        { id: "d7", name: "POA", category: "Legal", shared: false },
      ],
      family: {
        name: "Amy Chen",
        email: "amy.chen@example.com",
        phone: "(512) 555-0199",
        relationship: "Daughter",
      },
      status: "more_info",
      assigneeId: "tm-sofia",
      assigneeName: "Sofia Nguyen",
      internalNotes: [
        {
          id: "n1",
          author: "Sofia Nguyen",
          body: "Need updated POA before clinical review can finish.",
          at: "2026-04-12T11:00:00.000Z",
        },
      ],
      infoRequest: "Please confirm nighttime wandering episodes in the last 30 days.",
      documentRequest: "Power of attorney · Recent labs",
      tourProposal: "Thu Apr 23 · 2:00 PM",
      assessmentProposal: null,
      waitlistPosition: null,
      submittedAt: "2026-04-08T10:00:00.000Z",
      lastUpdated: "2026-04-12T11:00:00.000Z",
      auditLog: [
        audit("System", "Application received"),
        audit("Sofia Nguyen", "Assigned to Sofia Nguyen"),
        audit("Sofia Nguyen", "Requested documents: Power of attorney · Recent labs"),
        audit("Marcus Hale", "Proposed tour: Thu Apr 23 · 2:00 PM"),
      ],
    },
    {
      id: "capp-3",
      residenceId: r.id,
      seniorName: "Helen Brooks",
      seniorAge: 88,
      relationship: "Aunt",
      summary: "Assisted living. Assessment scheduled. Strong financial clearance.",
      careNeeds: ["Bathing assist", "Meal prep", "Fall risk precautions"],
      medicalHighlights: ["COPD", "History of falls"],
      documents: [
        { id: "d8", name: "Photo ID", category: "Identity", shared: true },
        { id: "d9", name: "Insurance", category: "Insurance", shared: true },
        { id: "d10", name: "Physical therapy notes", category: "Clinical", shared: true },
      ],
      family: {
        name: "Daniel Brooks",
        email: "daniel.brooks@example.com",
        phone: "(737) 555-0110",
        relationship: "Nephew",
      },
      status: "assessment_requested",
      assigneeId: "tm-priya",
      assigneeName: "Priya Shah",
      internalNotes: [],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: "Mon Apr 27 · 10:30 AM · Nursing assessment",
      waitlistPosition: null,
      submittedAt: "2026-04-05T09:00:00.000Z",
      lastUpdated: "2026-04-11T14:00:00.000Z",
      auditLog: [
        audit("System", "Application received"),
        audit("Priya Shah", "Proposed nursing assessment"),
      ],
    },
    {
      id: "capp-4",
      residenceId: r.id,
      seniorName: "James Ortega",
      seniorAge: 81,
      relationship: "Husband",
      summary: "Waitlisted for private suite. Family flexible on timing.",
      careNeeds: ["Medication management", "Mobility support"],
      medicalHighlights: ["CHF (stable)"],
      documents: [
        { id: "d11", name: "Photo ID", category: "Identity", shared: true },
        { id: "d12", name: "Insurance", category: "Insurance", shared: true },
      ],
      family: {
        name: "Maria Ortega",
        email: "maria.ortega@example.com",
        phone: "(512) 555-0177",
        relationship: "Wife",
      },
      status: "waitlisted",
      assigneeId: "tm-marcus",
      assigneeName: "Marcus Hale",
      internalNotes: [
        {
          id: "n2",
          author: "Marcus Hale",
          body: "Happy with shared temporarily if private opens later.",
          at: "2026-04-09T16:00:00.000Z",
        },
      ],
      infoRequest: null,
      documentRequest: null,
      tourProposal: null,
      assessmentProposal: null,
      waitlistPosition: 3,
      submittedAt: "2026-03-28T12:00:00.000Z",
      lastUpdated: "2026-04-09T16:00:00.000Z",
      auditLog: [audit("Marcus Hale", "Placed on waitlist · position 3")],
    },
    {
      id: "capp-5",
      residenceId: r.id,
      seniorName: "Dorothy Walsh",
      seniorAge: 86,
      relationship: "Mother",
      summary: "New inbound — not yet assigned. Quick triage needed.",
      careNeeds: ["Assisted living", "Social programming"],
      medicalHighlights: ["Well-managed hypertension"],
      documents: [
        { id: "d13", name: "Photo ID", category: "Identity", shared: true },
      ],
      family: {
        name: "Tom Walsh",
        email: "tom.walsh@example.com",
        phone: "(512) 555-0133",
        relationship: "Son",
      },
      status: "submitted",
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
      auditLog: [audit("System", "Application submitted via Haven")],
    },
  ];

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
      roomTypes: r.pricing.map((p) => ({
        name: p.room,
        price: p.price,
        notes: p.notes,
      })),
      promotions: "Spring move-in credit: first community fee waived for May admissions.",
      waitlistNotes: "Memory care waitlist currently ~4–6 weeks for private suites.",
    },
    availability,
    applications,
    team,
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
