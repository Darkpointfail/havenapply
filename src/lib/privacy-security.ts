/** Privacy, consent ledger, sensitive-data helpers, functional controls (demo / client-side) */

export type ConsentShareKind = "application" | "document" | "profile_summary" | "message_attachment";

export type ConsentRecord = {
  id: string;
  kind: ConsentShareKind;
  communityId: string;
  communityName: string;
  resourceLabel: string;
  sharedAt: string;
  authorizedBy: string;
  authorizedByEmail: string;
  /** Future access still allowed */
  active: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  notes?: string;
};

export type AccessEvent = {
  id: string;
  at: string;
  actor: string;
  action:
    | "view_sensitive"
    | "download"
    | "delete"
    | "share"
    | "revoke_share"
    | "export"
    | "password_change"
    | "session_revoke"
    | "deletion_request";
  resource: string;
  detail?: string;
};

export type ActiveSession = {
  id: string;
  label: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
  userAgentHint: string;
};

export type SensitiveLink = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
};

export type DeletionRequest = {
  id: string;
  requestedAt: string;
  status: "pending" | "cancelled" | "completed";
  note: string;
};

export type PrivacyPreferences = {
  marketingEmails: boolean;
  productEmails: boolean;
  securityEmails: boolean;
  shareAnalytics: boolean;
  /** Explicit consent to share application packets with selected communities */
  applicationShareConsent: boolean;
};

export type PrivacyWorkspace = {
  consents: ConsentRecord[];
  accessLog: AccessEvent[];
  sessions: ActiveSession[];
  sensitiveLinks: SensitiveLink[];
  deletionRequest: DeletionRequest | null;
  preferences: PrivacyPreferences;
  updatedAt: string;
};

export const SENSITIVE_WARNING =
  "This action involves personal or clinical information. Only continue if you intend to share or download it for a legitimate admissions purpose.";

export const COMPLIANCE_DISCLAIMER =
  "Haven implements functional access controls and consent tracking to help families manage sharing. Haven does not claim HIPAA, SOC 2, or other formal compliance certifications unless and until independently validated for a specific production deployment and its vendors.";

/** Mask SSN-like / long numeric / email middle */
export function maskSensitiveText(value: string): string {
  if (!value) return value;
  // SSN pattern
  if (/^\d{3}-\d{2}-\d{4}$/.test(value)) {
    return `•••-••-${value.slice(-4)}`;
  }
  if (/^\d{9}$/.test(value)) {
    return `•••••${value.slice(-4)}`;
  }
  // Email
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    if (local.length <= 2) return `••@${domain}`;
    return `${local[0]}${"•".repeat(Math.min(local.length - 1, 6))}@${domain}`;
  }
  // Phone
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `(•••) •••-${digits.slice(-4)}`;
  }
  // Generic long string
  if (value.length > 8) {
    return `${value.slice(0, 2)}${"•".repeat(Math.min(value.length - 4, 8))}${value.slice(-2)}`;
  }
  return "••••";
}

export function formatPrivacyTime(iso: string) {
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

export function linkExpiresAt(hours = 24) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function isLinkExpired(link: SensitiveLink, now = new Date()) {
  if (link.revoked) return true;
  return new Date(link.expiresAt).getTime() < now.getTime();
}

export function seedPrivacyWorkspace(userName: string, userEmail: string): PrivacyWorkspace {
  const now = new Date().toISOString();
  return {
    // No seeded active consents — grants must be explicit (never pre-populated as active).
    consents: [],
    accessLog: [
      {
        id: "ae-1",
        at: now,
        actor: userName,
        action: "view_sensitive",
        resource: "Privacy center",
        detail: "Workspace initialized",
      },
    ],
    sessions: [
      {
        id: "sess-current",
        label: "This browser",
        createdAt: now,
        lastActiveAt: now,
        current: true,
        userAgentHint: "Desktop · current session",
      },
    ],
    sensitiveLinks: [],
    deletionRequest: null,
    preferences: {
      marketingEmails: false,
      productEmails: false,
      securityEmails: false,
      shareAnalytics: false,
      applicationShareConsent: false,
    },
    updatedAt: now,
  };
}
