import type { InvitationStatus } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

export class InvitationError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "InvitationError";
    this.code = code;
    this.status = status;
  }
}

export type InviteKind = "caregiver" | "staff";

export type InvitePublicState =
  | "VALID"
  | "EXPIRED"
  | "REVOKED"
  | "USED"
  | "NOT_FOUND"
  | "WRONG_ACCOUNT"
  | "RATE_LIMITED";

export function invitationTtlMs(): number {
  return getEnv().INVITATION_TTL_HOURS * 60 * 60 * 1000;
}

export function invitationAcceptPath(kind: InviteKind, locale: string, rawToken: string) {
  // Token only — never put email or PII in the URL.
  return `/${locale}/invite/${kind}?t=${encodeURIComponent(rawToken)}`;
}

export function invitationAbsoluteUrl(kind: InviteKind, locale: string, rawToken: string) {
  return `${getEnv().APP_URL}${invitationAcceptPath(kind, locale, rawToken)}`;
}

/** Map stored status + expiry into a public UI state (no PII). */
export function resolveInvitationState(input: {
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
}): InvitePublicState {
  if (input.status === "REVOKED" || input.revokedAt) return "REVOKED";
  if (input.status === "ACCEPTED" || input.acceptedAt) return "USED";
  if (input.status === "EXPIRED" || input.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  return "VALID";
}

export function assertInviteRateLimit(input: {
  ipAddress?: string | null;
  tokenHint: string;
  action: string;
}) {
  const env = getEnv();
  const key = `invite:${input.action}:${input.ipAddress || "unknown"}:${input.tokenHint.slice(0, 12)}`;
  const result = rateLimit({
    key,
    limit: env.INVITATION_ATTEMPT_LIMIT,
    windowMs: 15 * 60 * 1000,
  });
  if (!result.ok) {
    void writeAudit({
      action: "invitation.rate_limited",
      entityType: "Invitation",
      metadata: { action: input.action },
      ipAddress: input.ipAddress,
    });
    throw new InvitationError("RATE_LIMITED", 429);
  }
}

export function permissionsForStaffOrgRole(
  orgRole: "OWNER" | "EDITOR" | "VIEWER",
): Array<
  | "VIEW_APPLICATIONS"
  | "MANAGE_APPLICATIONS"
  | "MANAGE_DOCUMENTS"
  | "MANAGE_STAFF"
  | "MANAGE_ORG"
> {
  if (orgRole === "VIEWER") return ["VIEW_APPLICATIONS"];
  if (orgRole === "EDITOR") {
    return ["VIEW_APPLICATIONS", "MANAGE_APPLICATIONS", "MANAGE_DOCUMENTS"];
  }
  return [
    "VIEW_APPLICATIONS",
    "MANAGE_APPLICATIONS",
    "MANAGE_DOCUMENTS",
    "MANAGE_STAFF",
    "MANAGE_ORG",
  ];
}
