import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.email_verified"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.session_revoked"
  | "staff.invitation_created"
  | "staff.invitation_accepted"
  | "document.viewed"
  | "document.downloaded"
  | "application.status_changed";

/**
 * Persist an audit event. Never pass secrets, tokens, passwords, or medical content
 * in `metadata`.
 */
export async function writeAudit(input: {
  actorUserId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.auditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
