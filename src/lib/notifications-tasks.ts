/** Centralized notifications & tasks for Haven family portal */

export type NotificationType =
  | "email_confirmed"
  | "profile_incomplete"
  | "document_missing"
  | "document_expiring"
  | "application_sent"
  | "application_received"
  | "new_message"
  | "info_requested"
  | "tour_proposed"
  | "assessment_requested"
  | "status_change"
  | "waitlisted"
  | "approved"
  | "declined"
  | "family_invitation"
  | "task_reminder";

export type NotificationPriority = "high" | "normal" | "low";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href: string;
  priority: NotificationPriority;
  meta?: string;
};

export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export type TaskComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type FamilyTaskItem = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  applicationId: string | null;
  applicationLabel: string | null;
  communityId: string | null;
  communityName: string | null;
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferences = {
  email: boolean;
  inApp: boolean;
  types: Record<NotificationType, boolean>;
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  email_confirmed: "Email confirmed",
  profile_incomplete: "Incomplete profile",
  document_missing: "Missing document",
  document_expiring: "Expiring document",
  application_sent: "Application sent",
  application_received: "Application received",
  new_message: "New message",
  info_requested: "Info requested",
  tour_proposed: "Tour proposed",
  assessment_requested: "Assessment requested",
  status_change: "Status change",
  waitlisted: "Waitlisted",
  approved: "Approved",
  declined: "Declined",
  family_invitation: "Family invitation",
  task_reminder: "Task reminder",
};

export const ALL_NOTIFICATION_TYPES = Object.keys(
  NOTIFICATION_TYPE_LABELS,
) as NotificationType[];

export function defaultPreferences(): NotificationPreferences {
  const types = Object.fromEntries(
    ALL_NOTIFICATION_TYPES.map((t) => [t, true]),
  ) as Record<NotificationType, boolean>;
  return { email: true, inApp: true, types };
}

export function formatNotifTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function notificationTone(
  type: NotificationType,
): "brand" | "warn" | "success" | "danger" | "accent" | "neutral" {
  switch (type) {
    case "approved":
    case "email_confirmed":
      return "success";
    case "declined":
      return "danger";
    case "document_missing":
    case "document_expiring":
    case "profile_incomplete":
    case "task_reminder":
    case "info_requested":
      return "warn";
    case "new_message":
    case "tour_proposed":
    case "family_invitation":
      return "accent";
    case "application_sent":
    case "application_received":
    case "status_change":
    case "waitlisted":
    case "assessment_requested":
      return "brand";
    default:
      return "neutral";
  }
}

export function seedNotifications(): AppNotification[] {
  return [
    {
      id: "n-1",
      type: "document_missing",
      title: "Document missing",
      body: "Lakeside Haven still needs a doctor’s letter to continue review.",
      createdAt: "2026-04-16T10:00:00.000Z",
      read: false,
      href: "/family/documents",
      priority: "high",
      meta: "Lakeside Haven",
    },
    {
      id: "n-2",
      type: "new_message",
      title: "New message",
      body: "Sofia Nguyen asked about scheduling a family visit at Maple Grove.",
      createdAt: "2026-04-16T09:05:00.000Z",
      read: false,
      href: "/family/messages?community=maple-grove",
      priority: "high",
      meta: "Maple Grove",
    },
    {
      id: "n-3",
      type: "tour_proposed",
      title: "Tour proposed",
      body: "Maple Grove proposed a tour for Tue Apr 21 · 2:00 PM.",
      createdAt: "2026-04-15T16:20:00.000Z",
      read: false,
      href: "/family/applications",
      priority: "normal",
      meta: "Maple Grove",
    },
    {
      id: "n-4",
      type: "info_requested",
      title: "Additional information requested",
      body: "Cedar Memory Care asked about nighttime wandering episodes.",
      createdAt: "2026-04-15T11:00:00.000Z",
      read: false,
      href: "/family/applications",
      priority: "high",
      meta: "Cedar Memory Care",
    },
    {
      id: "n-5",
      type: "application_sent",
      title: "Application sent",
      body: "Your application to Orchard House was submitted successfully.",
      createdAt: "2026-04-14T15:20:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Orchard House",
    },
    {
      id: "n-6",
      type: "application_received",
      title: "Application received",
      body: "Maple Grove confirmed they received your application.",
      createdAt: "2026-04-14T15:40:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Maple Grove",
    },
    {
      id: "n-7",
      type: "waitlisted",
      title: "Placed on waitlist",
      body: "You’re position 4 on the Cedar Memory Care waitlist.",
      createdAt: "2026-04-12T09:00:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Cedar Memory Care",
    },
    {
      id: "n-8",
      type: "document_expiring",
      title: "Document expiring",
      body: "Physician report expires in 14 days — renew before re-sharing.",
      createdAt: "2026-04-11T08:00:00.000Z",
      read: false,
      href: "/family/documents",
      priority: "normal",
    },
    {
      id: "n-9",
      type: "profile_incomplete",
      title: "Profile incomplete",
      body: "Care needs section is 60% complete — finishing it improves match quality.",
      createdAt: "2026-04-10T12:00:00.000Z",
      read: true,
      href: "/family/care-needs",
      priority: "low",
    },
    {
      id: "n-10",
      type: "email_confirmed",
      title: "Email confirmed",
      body: "Your Haven email address was verified successfully.",
      createdAt: "2026-02-10T10:05:00.000Z",
      read: true,
      href: "/family/settings",
      priority: "low",
    },
    {
      id: "n-11",
      type: "family_invitation",
      title: "Family invitation",
      body: "Sarah Nguyen was invited as Medical information contributor.",
      createdAt: "2026-04-16T08:00:00.000Z",
      read: false,
      href: "/family/family-members",
      priority: "normal",
    },
    {
      id: "n-12",
      type: "task_reminder",
      title: "Task reminder",
      body: "Upload physician report is due today.",
      createdAt: "2026-04-16T07:30:00.000Z",
      read: false,
      href: "/family/tasks",
      priority: "high",
    },
    {
      id: "n-13",
      type: "assessment_requested",
      title: "Assessment requested",
      body: "Lakeside Haven requested a nursing assessment for Helen’s file.",
      createdAt: "2026-04-13T14:00:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Lakeside Haven",
    },
    {
      id: "n-14",
      type: "status_change",
      title: "Status change",
      body: "Maple Grove moved your application to Under review.",
      createdAt: "2026-04-09T10:00:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Maple Grove",
    },
    {
      id: "n-15",
      type: "approved",
      title: "Approved",
      body: "Conditional approval received from Maple Grove — review next steps.",
      createdAt: "2026-04-08T16:00:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "high",
      meta: "Maple Grove",
    },
    {
      id: "n-16",
      type: "declined",
      title: "Declined",
      body: "Sunrise Terrace declined due to care level mismatch.",
      createdAt: "2026-04-05T11:00:00.000Z",
      read: true,
      href: "/family/applications",
      priority: "normal",
      meta: "Sunrise Terrace",
    },
  ];
}

export function seedTasks(): FamilyTaskItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "task-1",
      title: "Upload physician report",
      description: "Lakeside asked for an updated doctor’s letter before clinical review.",
      assignee: "Claire Martin",
      dueDate: "2026-04-16",
      priority: "High",
      status: "open",
      applicationId: "app-3",
      applicationLabel: "Lakeside Haven application",
      communityId: "lakeside-haven",
      communityName: "Lakeside Haven",
      comments: [
        {
          id: "tc-1",
          author: "Claire Martin",
          body: "Waiting on Dr. Patel’s office — expected by Friday.",
          createdAt: "2026-04-14T09:00:00.000Z",
        },
      ],
      createdAt: "2026-04-12T10:00:00.000Z",
      updatedAt: now,
    },
    {
      id: "task-2",
      title: "Call insurance provider",
      description: "Confirm long-term care coverage and out-of-pocket estimates.",
      assignee: "Paul Martin",
      dueDate: "2026-04-18",
      priority: "High",
      status: "in_progress",
      applicationId: null,
      applicationLabel: null,
      communityId: null,
      communityName: null,
      comments: [],
      createdAt: "2026-04-11T11:00:00.000Z",
      updatedAt: now,
    },
    {
      id: "task-3",
      title: "Review pricing",
      description: "Compare Maple Grove private suite vs Orchard House shared quotes.",
      assignee: "Claire Martin",
      dueDate: "2026-04-20",
      priority: "Medium",
      status: "open",
      applicationId: null,
      applicationLabel: null,
      communityId: "maple-grove",
      communityName: "Maple Grove Residence",
      comments: [],
      createdAt: "2026-04-13T08:00:00.000Z",
      updatedAt: now,
    },
    {
      id: "task-4",
      title: "Prepare for tour",
      description: "Bring POA, medication list, and questions for the admissions RN.",
      assignee: "Léna Martin",
      dueDate: "2026-04-21",
      priority: "High",
      status: "open",
      applicationId: "app-1",
      applicationLabel: "Maple Grove application",
      communityId: "maple-grove",
      communityName: "Maple Grove Residence",
      comments: [],
      createdAt: "2026-04-14T12:00:00.000Z",
      updatedAt: now,
    },
    {
      id: "task-5",
      title: "Answer facility questions",
      description: "Respond to Cedar Memory Care about nighttime wandering episodes.",
      assignee: "Claire Martin",
      dueDate: "2026-04-17",
      priority: "High",
      status: "open",
      applicationId: "app-2",
      applicationLabel: "Cedar Memory Care application",
      communityId: "cedar-memory",
      communityName: "Cedar Memory Care",
      comments: [],
      createdAt: "2026-04-15T11:30:00.000Z",
      updatedAt: now,
    },
    {
      id: "task-6",
      title: "Confirm move-in date",
      description: "Align family calendar with Maple Grove’s proposed August 1 move-in.",
      assignee: "Claire Martin",
      dueDate: "2026-04-25",
      priority: "Medium",
      status: "open",
      applicationId: "app-1",
      applicationLabel: "Maple Grove application",
      communityId: "maple-grove",
      communityName: "Maple Grove Residence",
      comments: [],
      createdAt: "2026-04-15T16:00:00.000Z",
      updatedAt: now,
    },
  ];
}
