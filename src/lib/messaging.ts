import { images } from "@/data/images";

export type ConversationScope = "community" | "application" | "general";

export type MessageDelivery = "sending" | "sent" | "delivered" | "read";

export type MessageKind =
  | "text"
  | "document-request"
  | "visit"
  | "admission"
  | "attachment"
  | "system";

export type SecureMessage = {
  id: string;
  fromRole: "family" | "community";
  senderName: string;
  senderRole: string;
  text: string;
  /** Display time e.g. Apr 8 · 15:30 */
  time: string;
  timestamp: string;
  delivery: MessageDelivery;
  type: MessageKind;
  meta?: string;
  attachments?: { name: string; size: string }[];
  readByFamily: boolean;
  readByCommunity: boolean;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

export type MessageThread = {
  id: string;
  scope: ConversationScope;
  residenceId: string;
  residenceName: string;
  applicationId: string | null;
  subject: string;
  avatar: string;
  /** Family emails authorized to see this thread */
  authorizedFamilyEmails: string[];
  archivedByFamily: boolean;
  archivedByCommunity: boolean;
  messages: SecureMessage[];
  auditLog: AuditEntry[];
  updatedAt: string;
};

export type QuickTemplate = {
  id: string;
  label: string;
  body: string;
  sensitive?: boolean;
};

export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "pricing",
    label: "Request pricing details",
    body: "Could you share current monthly rates and any community or care fees for the room types we’re considering?",
  },
  {
    id: "availability",
    label: "Ask about availability",
    body: "We’re hoping to understand near-term availability and typical wait times for a suitable suite.",
  },
  {
    id: "tour",
    label: "Schedule a tour",
    body: "We’d like to schedule a tour. Which dates and times work best for your admissions team this week?",
  },
  {
    id: "document",
    label: "Send requested document",
    body: "We’ve uploaded the documents you requested to our Haven vault and attached them to this application. Please let us know if anything else is needed.",
  },
  {
    id: "criteria",
    label: "Ask about admission criteria",
    body: "Could you clarify your admission criteria and any clinical conditions you typically cannot accept?",
  },
  {
    id: "followup",
    label: "Follow up on application",
    body: "We’re following up on our application. Is there any additional information that would help your review?",
  },
  {
    id: "withdraw",
    label: "Withdraw application",
    body: "After careful consideration, we need to withdraw our application. Thank you for your time and care.",
  },
];

const SENSITIVE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/, label: "possible SSN" },
  { re: /\b\d{9}\b/, label: "long numeric ID" },
  { re: /\b(?:medicare|medicaid)\s*(?:number|#|no\.?)?\s*[:#]?\s*\d/i, label: "Medicare/Medicaid number" },
  { re: /\b(?:routing|account)\s*(?:number|#)?\s*[:#]?\s*\d{6,}/i, label: "bank account details" },
  { re: /\b(?:password|ssn|social security)\b/i, label: "sensitive credential language" },
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "possible card number" },
];

export function detectSensitiveContent(text: string): string[] {
  return SENSITIVE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

export function formatMessageTime(d = new Date()) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function threadPreview(t: MessageThread) {
  const last = t.messages[t.messages.length - 1];
  return last?.text || t.subject;
}

export function unreadForRole(t: MessageThread, role: "family" | "community") {
  return t.messages.filter((m) =>
    role === "family" ? !m.readByFamily && m.fromRole === "community" : !m.readByCommunity && m.fromRole === "family",
  ).length;
}

/** Map community org / demo email → residence IDs they may access */
export function residencesForCommunityOrg(
  organization?: string,
  email?: string,
): string[] {
  const org = (organization || "").toLowerCase();
  const mail = (email || "").toLowerCase();

  if (org.includes("maple") || mail.startsWith("community@")) return ["maple-grove"];
  if (org.includes("lakeside")) return ["lakeside-haven"];
  if (org.includes("cedar ridge") || org.includes("cedar memory")) return ["cedar-memory"];
  if (org.includes("orchard")) return ["orchard-house"];
  if (org.includes("willow")) return ["willow-terrace"];
  if (org.includes("harbor")) return ["harbor-view"];
  if (org.includes("sunset")) return ["sunset-oaks"];

  // Unknown org: no access (private by default)
  return [];
}

function audit(actor: string, action: string): AuditEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor,
    action,
  };
}

export function seedThreads(familyEmail: string): MessageThread[] {
  const email = familyEmail.toLowerCase() || "family@demo.haven";
  const now = new Date().toISOString();

  return [
    {
      id: "thread-maple-app1",
      scope: "application",
      residenceId: "maple-grove",
      residenceName: "Maple Grove Residence",
      applicationId: "app-1",
      subject: "Application · Maple Grove",
      avatar: images.caregiverSenior,
      authorizedFamilyEmails: [email, "family@demo.haven"],
      archivedByFamily: false,
      archivedByCommunity: false,
      updatedAt: now,
      auditLog: [
        audit("System", "Conversation opened for application app-1"),
        audit("Sofia Nguyen", "Admission confirmation sent"),
      ],
      messages: [
        {
          id: "tm1",
          fromRole: "community",
          senderName: "Sofia Nguyen",
          senderRole: "Admissions RN",
          text: "Thank you for applying to Maple Grove. We’ve reviewed the senior profile.",
          time: "Mar 18 · 10:12 AM",
          timestamp: "2026-03-18T10:12:00",
          delivery: "read",
          type: "text",
          readByFamily: true,
          readByCommunity: true,
        },
        {
          id: "tm2",
          fromRole: "family",
          senderName: "Family",
          senderRole: "Primary contact",
          text: "Wonderful — happy to provide anything else you need.",
          time: "Mar 18 · 11:40 AM",
          timestamp: "2026-03-18T11:40:00",
          delivery: "read",
          type: "text",
          readByFamily: true,
          readByCommunity: true,
        },
        {
          id: "tm3",
          fromRole: "community",
          senderName: "Sofia Nguyen",
          senderRole: "Admissions RN",
          text: "Would you like to schedule a family visit next week?",
          meta: "Proposed: Tue Apr 21 · 2:00 PM",
          time: "Apr 2 · 9:05 AM",
          timestamp: "2026-04-02T09:05:00",
          delivery: "delivered",
          type: "visit",
          readByFamily: false,
          readByCommunity: true,
        },
        {
          id: "tm4",
          fromRole: "community",
          senderName: "Sofia Nguyen",
          senderRole: "Admissions RN",
          text: "We’re delighted to confirm admission for August 1.",
          meta: "Admission confirmed",
          time: "Apr 2 · 2:22 PM",
          timestamp: "2026-04-02T14:22:00",
          delivery: "delivered",
          type: "admission",
          readByFamily: false,
          readByCommunity: true,
        },
      ],
    },
    {
      id: "thread-lakeside-app3",
      scope: "application",
      residenceId: "lakeside-haven",
      residenceName: "Lakeside Haven",
      applicationId: "app-3",
      subject: "Documents requested",
      avatar: images.gentleCare,
      authorizedFamilyEmails: [email, "family@demo.haven"],
      archivedByFamily: false,
      archivedByCommunity: false,
      updatedAt: now,
      auditLog: [audit("Thomas Berger", "Document request sent")],
      messages: [
        {
          id: "tl1",
          fromRole: "community",
          senderName: "Thomas Berger",
          senderRole: "Admissions nurse",
          text: "To continue reviewing the application, please upload the following.",
          meta: "Doctor’s letter · Recent lab results",
          time: "Apr 8 · 3:30 PM",
          timestamp: "2026-04-08T15:30:00",
          delivery: "delivered",
          type: "document-request",
          readByFamily: false,
          readByCommunity: true,
        },
        {
          id: "tl2",
          fromRole: "family",
          senderName: "Family",
          senderRole: "Primary contact",
          text: "We’ll have these uploaded by Friday.",
          time: "Apr 8 · 4:10 PM",
          timestamp: "2026-04-08T16:10:00",
          delivery: "read",
          type: "text",
          readByFamily: true,
          readByCommunity: true,
        },
      ],
    },
    {
      id: "thread-cedar-wait",
      scope: "application",
      residenceId: "cedar-memory",
      residenceName: "Cedar Memory Care",
      applicationId: "app-2",
      subject: "Waitlist update",
      avatar: images.holdingHands,
      authorizedFamilyEmails: [email, "family@demo.haven"],
      archivedByFamily: false,
      archivedByCommunity: false,
      updatedAt: now,
      auditLog: [audit("Aisha Rahman", "Waitlist position shared")],
      messages: [
        {
          id: "tc1",
          fromRole: "community",
          senderName: "Aisha Rahman",
          senderRole: "Memory care admissions",
          text: "Your loved one is currently position 4 on our waiting list. We’ll notify you as soon as a suite opens.",
          time: "Apr 5 · 11:00 AM",
          timestamp: "2026-04-05T11:00:00",
          delivery: "read",
          type: "text",
          readByFamily: true,
          readByCommunity: true,
        },
      ],
    },
    {
      id: "thread-orchard-general",
      scope: "general",
      residenceId: "orchard-house",
      residenceName: "Orchard House",
      applicationId: null,
      subject: "General inquiry",
      avatar: images.grandmotherChild,
      authorizedFamilyEmails: [email, "family@demo.haven"],
      archivedByFamily: false,
      archivedByCommunity: false,
      updatedAt: now,
      auditLog: [audit("Family", "Started general inquiry")],
      messages: [
        {
          id: "to1",
          fromRole: "family",
          senderName: "Family",
          senderRole: "Primary contact",
          text: "Hi — we’re exploring boutique assisted living and would love more information about your community.",
          time: "Apr 12 · 1:00 PM",
          timestamp: "2026-04-12T13:00:00",
          delivery: "delivered",
          type: "text",
          readByFamily: true,
          readByCommunity: false,
        },
      ],
    },
  ];
}

export function createThread(input: {
  scope: ConversationScope;
  residenceId: string;
  residenceName: string;
  avatar: string;
  applicationId?: string | null;
  subject: string;
  familyEmail: string;
  firstMessage: string;
  senderName: string;
  fromRole?: "family" | "community";
  senderRole?: string;
}): MessageThread {
  const now = new Date();
  const fromRole = input.fromRole || "family";
  const msg: SecureMessage = {
    id: `msg-${now.getTime()}`,
    fromRole,
    senderName: input.senderName,
    senderRole: input.senderRole || (fromRole === "community" ? "Admissions" : "Primary contact"),
    text: input.firstMessage,
    time: formatMessageTime(now),
    timestamp: now.toISOString(),
    delivery: "sent",
    type: "text",
    readByFamily: fromRole === "family",
    readByCommunity: fromRole === "community",
  };
  return {
    id: `thread-${input.residenceId}-${now.getTime()}`,
    scope: input.scope,
    residenceId: input.residenceId,
    residenceName: input.residenceName,
    applicationId: input.applicationId ?? null,
    subject: input.subject,
    avatar: input.avatar,
    authorizedFamilyEmails: [input.familyEmail.toLowerCase()],
    archivedByFamily: false,
    archivedByCommunity: false,
    updatedAt: now.toISOString(),
    messages: [msg],
    auditLog: [
      {
        id: `aud-${now.getTime()}`,
        at: now.toISOString(),
        actor: input.senderName,
        action: `Started ${input.scope} conversation`,
      },
    ],
  };
}
