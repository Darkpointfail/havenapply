/** Internal platform administration — users, communities, apps, moderation, analytics, audit */

export type PlatformUserStatus = "active" | "suspended" | "pending";

export type PlatformUserRole = "family" | "community" | "internal";

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformUserRole;
  status: PlatformUserStatus;
  registeredAt: string;
  lastLoginAt: string | null;
  organization?: string;
  incidentCount: number;
  notes?: string;
};

export type PartnershipStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "verified";

export type PlatformCommunity = {
  id: string;
  name: string;
  city: string;
  state: string;
  contactEmail: string;
  contactName: string;
  status: PartnershipStatus;
  verifiedProfile: boolean;
  submittedAt: string;
  lastReviewedAt: string | null;
  aboutPreview: string;
  publishedPriceFrom: number | null;
  publishedBeds: number;
  waitlistPublished: number;
  flags: string[];
};

export type AppHealthStatus =
  | "on_track"
  | "awaiting_family"
  | "awaiting_community"
  | "blocked"
  | "dispute"
  | "closed";

export type PlatformApplication = {
  id: string;
  seniorName: string;
  familyName: string;
  communityName: string;
  communityId: string;
  status: string;
  health: AppHealthStatus;
  submittedAt: string;
  lastActivityAt: string;
  responseHours: number | null;
  disputeNote: string | null;
  /** Redacted activity — no SSN / full clinical text */
  activityLog: { at: string; actor: string; action: string }[];
};

export type ModerationKind =
  | "review"
  | "photo"
  | "description"
  | "report"
  | "message"
  | "fake_profile"
  | "misleading";

export type ModerationStatus = "open" | "resolved" | "dismissed";

export type ModerationItem = {
  id: string;
  kind: ModerationKind;
  title: string;
  target: string;
  reporter: string;
  status: ModerationStatus;
  createdAt: string;
  severity: "low" | "medium" | "high";
  summary: string;
};

export type AuditActionType =
  | "login"
  | "view_sensitive"
  | "document_add"
  | "document_delete"
  | "permission_change"
  | "application_submit"
  | "status_change"
  | "download"
  | "admin_action";

export type AuditLogEntry = {
  id: string;
  at: string;
  actor: string;
  actorRole: string;
  actionType: AuditActionType;
  summary: string;
  /** Never include raw SSN / medical free text */
  resource: string;
  ipHint?: string;
};

export type PlatformAnalytics = {
  families: number;
  seniors: number;
  profilesCompleted: number;
  documentsAdded: number;
  searches: number;
  favorites: number;
  applications: number;
  applicationsByCommunity: { name: string; count: number }[];
  responseRate: number;
  acceptanceRate: number;
  avgResponseHours: number;
  activeCommunities: number;
  abandonedFunnels: number;
};

export type InternalWorkspace = {
  users: PlatformUser[];
  communities: PlatformCommunity[];
  applications: PlatformApplication[];
  moderation: ModerationItem[];
  auditLog: AuditLogEntry[];
  analytics: PlatformAnalytics;
  updatedAt: string;
};

export const MODERATION_KIND_LABELS: Record<ModerationKind, string> = {
  review: "Review",
  photo: "Photo",
  description: "Description",
  report: "Report",
  message: "Problematic message",
  fake_profile: "Fake profile",
  misleading: "Misleading information",
};

export const AUDIT_TYPE_LABELS: Record<AuditActionType, string> = {
  login: "Login",
  view_sensitive: "Sensitive data view",
  document_add: "Document added",
  document_delete: "Document deleted",
  permission_change: "Permission change",
  application_submit: "Application submitted",
  status_change: "Status change",
  download: "Download",
  admin_action: "Admin action",
};

export function formatAdminTime(iso: string) {
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

function entry(
  partial: Omit<AuditLogEntry, "id"> & { id?: string },
): AuditLogEntry {
  return {
    id: partial.id || `aud-${Math.random().toString(36).slice(2, 9)}`,
    at: partial.at,
    actor: partial.actor,
    actorRole: partial.actorRole,
    actionType: partial.actionType,
    summary: partial.summary,
    resource: partial.resource,
    ipHint: partial.ipHint,
  };
}

export function seedInternalWorkspace(): InternalWorkspace {
  const now = new Date().toISOString();

  const users: PlatformUser[] = [
    {
      id: "u-family",
      name: "Claire Martin",
      email: "family@demo.haven",
      role: "family",
      status: "active",
      registeredAt: "2026-02-10T10:00:00.000Z",
      lastLoginAt: "2026-04-16T09:12:00.000Z",
      incidentCount: 0,
    },
    {
      id: "u-newfamily",
      name: "Sarah Nguyen",
      email: "newfamily@demo.haven",
      role: "family",
      status: "active",
      registeredAt: "2026-04-01T14:00:00.000Z",
      lastLoginAt: "2026-04-15T18:40:00.000Z",
      incidentCount: 0,
    },
    {
      id: "u-community",
      name: "Jordan Lee",
      email: "community@demo.haven",
      role: "community",
      status: "active",
      registeredAt: "2026-01-20T11:00:00.000Z",
      lastLoginAt: "2026-04-16T08:05:00.000Z",
      organization: "Maple Grove Community",
      incidentCount: 0,
    },
    {
      id: "u-pending",
      name: "Amélie Rousseau",
      email: "pending@demo.haven",
      role: "community",
      status: "pending",
      registeredAt: "2026-04-10T16:00:00.000Z",
      lastLoginAt: "2026-04-14T12:00:00.000Z",
      organization: "Cedar Ridge Living",
      incidentCount: 0,
      notes: "Awaiting partnership verification",
    },
    {
      id: "u-admin",
      name: "Haven Ops",
      email: "admin@demo.haven",
      role: "internal",
      status: "active",
      registeredAt: "2025-11-01T09:00:00.000Z",
      lastLoginAt: now,
      incidentCount: 0,
    },
    {
      id: "u-susp",
      name: "Flagged User",
      email: "flagged.user@example.com",
      role: "family",
      status: "suspended",
      registeredAt: "2026-03-02T10:00:00.000Z",
      lastLoginAt: "2026-03-20T22:10:00.000Z",
      incidentCount: 3,
      notes: "Multiple misleading profile reports",
    },
  ];

  const communities: PlatformCommunity[] = [
    {
      id: "maple-grove",
      name: "Maple Grove Residence",
      city: "Austin",
      state: "TX",
      contactEmail: "community@demo.haven",
      contactName: "Jordan Lee",
      status: "verified",
      verifiedProfile: true,
      submittedAt: "2026-01-20T11:00:00.000Z",
      lastReviewedAt: "2026-02-01T10:00:00.000Z",
      aboutPreview: "Assisted living and memory care with garden courtyard.",
      publishedPriceFrom: 4200,
      publishedBeds: 3,
      waitlistPublished: 5,
      flags: [],
    },
    {
      id: "cedar-ridge-pending",
      name: "Cedar Ridge Living",
      city: "Round Rock",
      state: "TX",
      contactEmail: "pending@demo.haven",
      contactName: "Amélie Rousseau",
      status: "pending_review",
      verifiedProfile: false,
      submittedAt: "2026-04-10T16:00:00.000Z",
      lastReviewedAt: null,
      aboutPreview: "Boutique assisted living — partnership application in review.",
      publishedPriceFrom: null,
      publishedBeds: 0,
      waitlistPublished: 0,
      flags: ["Incomplete licensing upload"],
    },
    {
      id: "lakeside-haven",
      name: "Lakeside Haven",
      city: "Austin",
      state: "TX",
      contactEmail: "admissions@lakeside.demo",
      contactName: "Thomas Berger",
      status: "approved",
      verifiedProfile: true,
      submittedAt: "2026-02-15T09:00:00.000Z",
      lastReviewedAt: "2026-02-20T14:00:00.000Z",
      aboutPreview: "Waterfront assisted living with strong rehab partnerships.",
      publishedPriceFrom: 3900,
      publishedBeds: 2,
      waitlistPublished: 2,
      flags: [],
    },
    {
      id: "orchard-house",
      name: "Orchard House",
      city: "Cedar Park",
      state: "TX",
      contactEmail: "hello@orchard.demo",
      contactName: "Nina Park",
      status: "suspended",
      verifiedProfile: false,
      submittedAt: "2026-01-05T09:00:00.000Z",
      lastReviewedAt: "2026-04-01T11:00:00.000Z",
      aboutPreview: "Suspended pending pricing accuracy review.",
      publishedPriceFrom: 5100,
      publishedBeds: 1,
      waitlistPublished: 0,
      flags: ["Pricing mismatch vs advertised"],
    },
  ];

  const applications: PlatformApplication[] = [
    {
      id: "pa-1",
      seniorName: "Eleanor Martin",
      familyName: "Claire Martin",
      communityName: "Maple Grove Residence",
      communityId: "maple-grove",
      status: "received",
      health: "awaiting_community",
      submittedAt: "2026-04-14T15:20:00.000Z",
      lastActivityAt: "2026-04-14T15:20:00.000Z",
      responseHours: null,
      disputeNote: null,
      activityLog: [
        { at: "2026-04-14T15:20:00.000Z", actor: "Family", action: "Application submitted" },
        { at: "2026-04-14T15:21:00.000Z", actor: "System", action: "Community notified" },
      ],
    },
    {
      id: "pa-2",
      seniorName: "Robert Chen",
      familyName: "Amy Chen",
      communityName: "Maple Grove Residence",
      communityId: "maple-grove",
      status: "more_info",
      health: "awaiting_family",
      submittedAt: "2026-04-08T10:00:00.000Z",
      lastActivityAt: "2026-04-12T11:00:00.000Z",
      responseHours: 18,
      disputeNote: null,
      activityLog: [
        { at: "2026-04-08T10:00:00.000Z", actor: "Family", action: "Application submitted" },
        {
          at: "2026-04-12T11:00:00.000Z",
          actor: "Community",
          action: "Requested documents (details redacted)",
        },
      ],
    },
    {
      id: "pa-3",
      seniorName: "Helen Brooks",
      familyName: "Daniel Brooks",
      communityName: "Lakeside Haven",
      communityId: "lakeside-haven",
      status: "under_review",
      health: "blocked",
      submittedAt: "2026-03-20T09:00:00.000Z",
      lastActivityAt: "2026-04-02T14:00:00.000Z",
      responseHours: 42,
      disputeNote: null,
      activityLog: [
        {
          at: "2026-04-02T14:00:00.000Z",
          actor: "System",
          action: "Flagged as stalled (>10 days without progress)",
        },
      ],
    },
    {
      id: "pa-4",
      seniorName: "James Ortega",
      familyName: "Maria Ortega",
      communityName: "Maple Grove Residence",
      communityId: "maple-grove",
      status: "waitlisted",
      health: "dispute",
      submittedAt: "2026-03-28T12:00:00.000Z",
      lastActivityAt: "2026-04-10T16:00:00.000Z",
      responseHours: 8,
      disputeNote: "Family disputes waitlist position vs verbal commitment.",
      activityLog: [
        {
          at: "2026-04-10T16:00:00.000Z",
          actor: "Family",
          action: "Opened dispute (content redacted)",
        },
      ],
    },
  ];

  const moderation: ModerationItem[] = [
    {
      id: "mod-1",
      kind: "review",
      title: "Suspected fake review",
      target: "Orchard House · review #884",
      reporter: "System heuristic",
      status: "open",
      createdAt: "2026-04-12T09:00:00.000Z",
      severity: "medium",
      summary: "New account posted 5★ review within minutes of signup.",
    },
    {
      id: "mod-2",
      kind: "photo",
      title: "Photo rights claim",
      target: "Lakeside Haven · gallery",
      reporter: "External claimant",
      status: "open",
      createdAt: "2026-04-11T15:00:00.000Z",
      severity: "high",
      summary: "Claim that lobby photo is stock imagery used without license.",
    },
    {
      id: "mod-3",
      kind: "misleading",
      title: "Pricing mismatch",
      target: "Orchard House",
      reporter: "Family report",
      status: "open",
      createdAt: "2026-04-01T11:00:00.000Z",
      severity: "high",
      summary: "Published rate $5,100; family quoted $6,400 at tour.",
    },
    {
      id: "mod-4",
      kind: "message",
      title: "Hostile message flagged",
      target: "Thread · Maple Grove",
      reporter: "Auto-moderation",
      status: "resolved",
      createdAt: "2026-03-28T18:00:00.000Z",
      severity: "low",
      summary: "Message held for review; no PHI exposed. Content redacted.",
    },
    {
      id: "mod-5",
      kind: "fake_profile",
      title: "Suspected fake family profile",
      target: "flagged.user@example.com",
      reporter: "Community partner",
      status: "open",
      createdAt: "2026-03-21T10:00:00.000Z",
      severity: "high",
      summary: "Multiple applications with inconsistent senior demographics.",
    },
  ];

  const auditLog: AuditLogEntry[] = [
    entry({
      at: now,
      actor: "Haven Ops",
      actorRole: "internal",
      actionType: "login",
      summary: "Internal admin signed in",
      resource: "session",
      ipHint: "Austin, TX",
    }),
    entry({
      at: "2026-04-16T08:05:00.000Z",
      actor: "Jordan Lee",
      actorRole: "community",
      actionType: "login",
      summary: "Community portal login",
      resource: "maple-grove",
    }),
    entry({
      at: "2026-04-15T19:02:00.000Z",
      actor: "Claire Martin",
      actorRole: "family",
      actionType: "view_sensitive",
      summary: "Viewed medical section of senior profile",
      resource: "senior-profile · [redacted]",
    }),
    entry({
      at: "2026-04-15T19:10:00.000Z",
      actor: "Claire Martin",
      actorRole: "family",
      actionType: "document_add",
      summary: "Uploaded document (type: clinical · name redacted)",
      resource: "document-vault",
    }),
    entry({
      at: "2026-04-14T15:20:00.000Z",
      actor: "Claire Martin",
      actorRole: "family",
      actionType: "application_submit",
      summary: "Submitted application to Maple Grove",
      resource: "pa-1",
    }),
    entry({
      at: "2026-04-12T11:00:00.000Z",
      actor: "Sofia Nguyen",
      actorRole: "community",
      actionType: "status_change",
      summary: "Application status → more_info",
      resource: "pa-2",
    }),
    entry({
      at: "2026-04-10T16:30:00.000Z",
      actor: "Haven Ops",
      actorRole: "internal",
      actionType: "admin_action",
      summary: "Suspended Orchard House partnership listing",
      resource: "orchard-house",
    }),
    entry({
      at: "2026-04-09T12:00:00.000Z",
      actor: "Claire Martin",
      actorRole: "family",
      actionType: "permission_change",
      summary: "Changed family member role (Editor → Viewer)",
      resource: "household · member [redacted]",
    }),
    entry({
      at: "2026-04-08T17:40:00.000Z",
      actor: "Amy Chen",
      actorRole: "family",
      actionType: "download",
      summary: "Downloaded application PDF export",
      resource: "pa-2 · export",
    }),
    entry({
      at: "2026-04-05T09:15:00.000Z",
      actor: "Claire Martin",
      actorRole: "family",
      actionType: "document_delete",
      summary: "Removed outdated insurance card scan",
      resource: "document-vault · [redacted]",
    }),
  ];

  const analytics: PlatformAnalytics = {
    families: 1284,
    seniors: 1310,
    profilesCompleted: 892,
    documentsAdded: 6412,
    searches: 18420,
    favorites: 3901,
    applications: 2144,
    applicationsByCommunity: [
      { name: "Maple Grove Residence", count: 312 },
      { name: "Lakeside Haven", count: 278 },
      { name: "Cedar Memory Care", count: 241 },
      { name: "Orchard House", count: 119 },
      { name: "Others", count: 1194 },
    ],
    responseRate: 86,
    acceptanceRate: 31,
    avgResponseHours: 9.4,
    activeCommunities: 47,
    abandonedFunnels: 388,
  };

  return {
    users,
    communities,
    applications,
    moderation,
    auditLog,
    analytics,
    updatedAt: now,
  };
}
