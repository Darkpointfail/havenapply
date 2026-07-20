/** Family collaboration: roles, permissions, invitations, tasks, comments */

export type FamilyRole =
  | "owner"
  | "editor"
  | "viewer"
  | "financial"
  | "medical";

export type FamilyPermission =
  | "viewProfile"
  | "editProfile"
  | "viewMedical"
  | "viewDocuments"
  | "addDocuments"
  | "submitApplication"
  | "viewMessages"
  | "sendMessages"
  | "viewFinancial"
  | "inviteMembers"
  | "removeMembers"
  | "changePermissions"
  | "assignTasks"
  | "postComments";

export const FAMILY_ROLES: {
  id: FamilyRole;
  label: string;
  description: string;
}[] = [
  {
    id: "owner",
    label: "Owner",
    description: "Full control of the senior file, invitations, and permissions.",
  },
  {
    id: "editor",
    label: "Editor",
    description: "Update the profile, applications, documents, and messages.",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read profile, documents, and messages — no edits.",
  },
  {
    id: "financial",
    label: "Financial contributor",
    description: "See financial details and related documents only.",
  },
  {
    id: "medical",
    label: "Medical information contributor",
    description: "See and update medical information and clinical documents.",
  },
];

export const PERMISSION_LABELS: Record<FamilyPermission, string> = {
  viewProfile: "View senior profile",
  editProfile: "Edit senior profile",
  viewMedical: "View medical information",
  viewDocuments: "View documents",
  addDocuments: "Add documents",
  submitApplication: "Submit applications",
  viewMessages: "View messages",
  sendMessages: "Send messages",
  viewFinancial: "View financial information",
  inviteMembers: "Invite family members",
  removeMembers: "Remove family members",
  changePermissions: "Change member permissions",
  assignTasks: "Assign tasks",
  postComments: "Post internal comments",
};

const ALL: FamilyPermission[] = Object.keys(PERMISSION_LABELS) as FamilyPermission[];

const ROLE_PERMISSIONS: Record<FamilyRole, FamilyPermission[]> = {
  owner: ALL,
  editor: [
    "viewProfile",
    "editProfile",
    "viewMedical",
    "viewDocuments",
    "addDocuments",
    "submitApplication",
    "viewMessages",
    "sendMessages",
    "viewFinancial",
    "assignTasks",
    "postComments",
  ],
  viewer: ["viewProfile", "viewDocuments", "viewMessages", "postComments"],
  financial: [
    "viewProfile",
    "viewDocuments",
    "addDocuments",
    "viewFinancial",
    "postComments",
    "assignTasks",
  ],
  medical: [
    "viewProfile",
    "viewMedical",
    "viewDocuments",
    "addDocuments",
    "postComments",
    "assignTasks",
  ],
};

export function permissionsForRole(role: FamilyRole): FamilyPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: FamilyRole, permission: FamilyPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleLabel(role: FamilyRole) {
  return FAMILY_ROLES.find((r) => r.id === role)?.label ?? role;
}

export type MemberStatus = "active" | "pending" | "revoked";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type FamilyMember = {
  id: string;
  email: string;
  name: string;
  role: FamilyRole;
  status: MemberStatus;
  joinedAt: string | null;
  invitedAt: string;
  lastActiveAt: string | null;
};

export type FamilyInvitation = {
  id: string;
  token: string;
  email: string;
  name: string;
  role: FamilyRole;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  message?: string;
};

export type FamilyTask = {
  id: string;
  title: string;
  assigneeMemberId: string | null;
  assigneeName: string;
  due: string;
  done: boolean;
  createdBy: string;
  createdAt: string;
};

export type FamilyComment = {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

export type CollaborationAudit = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

export type FamilyHousehold = {
  id: string;
  /** Primary owner email — household key */
  ownerEmail: string;
  seniorLabel: string;
  members: FamilyMember[];
  invitations: FamilyInvitation[];
  tasks: FamilyTask[];
  comments: FamilyComment[];
  auditLog: CollaborationAudit[];
  updatedAt: string;
};

export const INVITE_TTL_DAYS = 7;

export function inviteExpiresAt(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d.toISOString();
}

export function isInviteExpired(inv: FamilyInvitation, now = new Date()) {
  if (inv.status === "expired") return true;
  if (inv.status !== "pending") return false;
  return new Date(inv.expiresAt).getTime() < now.getTime();
}

export function makeToken() {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function audit(actor: string, action: string): CollaborationAudit {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor,
    action,
  };
}

export function seedHousehold(ownerEmail: string, ownerName: string): FamilyHousehold {
  const email = ownerEmail.toLowerCase();
  const now = new Date().toISOString();
  const ownerId = "mem-owner";

  return {
    id: `hh-${email.replace(/[^a-z0-9]/g, "-")}`,
    ownerEmail: email,
    seniorLabel: "Mom · Eleanor",
    updatedAt: now,
    members: [
      {
        id: ownerId,
        email,
        name: ownerName || "Owner",
        role: "owner",
        status: "active",
        joinedAt: now,
        invitedAt: now,
        lastActiveAt: now,
      },
      {
        id: "mem-sister",
        email: "claire.martin@example.com",
        name: "Claire Martin",
        role: "editor",
        status: "active",
        joinedAt: "2026-03-01T10:00:00.000Z",
        invitedAt: "2026-02-28T10:00:00.000Z",
        lastActiveAt: "2026-04-10T14:00:00.000Z",
      },
      {
        id: "mem-brother",
        email: "paul.martin@example.com",
        name: "Paul Martin",
        role: "financial",
        status: "active",
        joinedAt: "2026-03-05T10:00:00.000Z",
        invitedAt: "2026-03-04T10:00:00.000Z",
        lastActiveAt: "2026-04-08T09:00:00.000Z",
      },
      {
        id: "mem-niece",
        email: "lena.martin@example.com",
        name: "Léna Martin",
        role: "viewer",
        status: "active",
        joinedAt: "2026-03-12T10:00:00.000Z",
        invitedAt: "2026-03-11T10:00:00.000Z",
        lastActiveAt: "2026-04-01T11:00:00.000Z",
      },
    ],
    invitations: [
      {
        id: "inv-pending-1",
        token: "inv_demo_pending_medical",
        email: "newfamily@demo.haven",
        name: "Sarah Nguyen",
        role: "medical",
        status: "pending",
        invitedBy: email,
        invitedByName: ownerName || "Owner",
        createdAt: now,
        expiresAt: inviteExpiresAt(new Date()),
        acceptedAt: null,
        message: "Please help keep Mom’s clinical documents current.",
      },
      {
        id: "inv-expired-1",
        token: "inv_demo_expired",
        email: "cousin@example.com",
        name: "Marc Martin",
        role: "viewer",
        status: "expired",
        invitedBy: email,
        invitedByName: ownerName || "Owner",
        createdAt: "2026-03-01T10:00:00.000Z",
        expiresAt: "2026-03-08T10:00:00.000Z",
        acceptedAt: null,
      },
    ],
    tasks: [
      {
        id: "ft-1",
        title: "Upload updated medication list",
        assigneeMemberId: "mem-sister",
        assigneeName: "Claire Martin",
        due: "This week",
        done: false,
        createdBy: ownerName || "Owner",
        createdAt: "2026-04-10T12:00:00.000Z",
      },
      {
        id: "ft-2",
        title: "Confirm long-term care insurance coverage",
        assigneeMemberId: "mem-brother",
        assigneeName: "Paul Martin",
        due: "Apr 22",
        done: false,
        createdBy: ownerName || "Owner",
        createdAt: "2026-04-11T09:00:00.000Z",
      },
      {
        id: "ft-3",
        title: "Review Maple Grove tour notes",
        assigneeMemberId: "mem-niece",
        assigneeName: "Léna Martin",
        due: "Done",
        done: true,
        createdBy: ownerName || "Owner",
        createdAt: "2026-04-05T09:00:00.000Z",
      },
    ],
    comments: [
      {
        id: "fc-1",
        authorName: "Claire Martin",
        authorEmail: "claire.martin@example.com",
        body: "Mom preferred the lakeside suite — noted on the compare board.",
        createdAt: "2026-04-09T16:20:00.000Z",
      },
      {
        id: "fc-2",
        authorName: ownerName || "Owner",
        authorEmail: email,
        body: "I’ll handle the Lakeside document request by Friday.",
        createdAt: "2026-04-10T08:15:00.000Z",
      },
    ],
    auditLog: [
      audit(ownerName || "Owner", "Created family household"),
      audit(ownerName || "Owner", "Invited Claire Martin as Editor"),
      audit(ownerName || "Owner", "Invited Paul Martin as Financial contributor"),
      audit("Claire Martin", "Accepted invitation"),
      audit(ownerName || "Owner", "Assigned task: Upload updated medication list"),
      audit(ownerName || "Owner", "Invited Sarah Nguyen as Medical information contributor"),
      audit("System", "Invitation to Marc Martin expired"),
    ],
  };
}

export function permissionMatrix(): {
  permission: FamilyPermission;
  label: string;
  roles: Record<FamilyRole, boolean>;
}[] {
  return (Object.keys(PERMISSION_LABELS) as FamilyPermission[]).map((permission) => ({
    permission,
    label: PERMISSION_LABELS[permission],
    roles: {
      owner: roleHasPermission("owner", permission),
      editor: roleHasPermission("editor", permission),
      viewer: roleHasPermission("viewer", permission),
      financial: roleHasPermission("financial", permission),
      medical: roleHasPermission("medical", permission),
    },
  }));
}

export function formatCollabTime(iso: string) {
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
