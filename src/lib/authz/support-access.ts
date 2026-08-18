/**
 * Support break-glass grants — must be created server-side by a super-admin
 * (or ops) with justification + TTL. Never accept client-minted grants.
 */

import type { SupportAccessGrant } from "@/lib/authz/types";
import { isSupportGrantValid } from "@/lib/authz/tenant";

export const SUPPORT_GRANT_MAX_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export type CreateSupportGrantInput = {
  id: string;
  targetType: SupportAccessGrant["targetType"];
  targetTenantId: string;
  justification: string;
  grantedByUserId: string;
  /** Absolute expiry; clamped to max TTL from `now`. */
  expiresAt: string;
  now?: Date;
};

export function createSupportGrant(input: CreateSupportGrantInput): {
  ok: true;
  grant: SupportAccessGrant;
} | { ok: false; error: string } {
  const justification = input.justification.trim();
  if (justification.length < 12) {
    return { ok: false, error: "Justification must be at least 12 characters." };
  }
  if (!input.targetTenantId.trim()) {
    return { ok: false, error: "targetTenantId is required." };
  }
  if (!input.grantedByUserId.trim()) {
    return { ok: false, error: "grantedByUserId is required." };
  }

  const now = input.now ?? new Date();
  const requested = new Date(input.expiresAt).getTime();
  if (Number.isNaN(requested) || requested <= now.getTime()) {
    return { ok: false, error: "expiresAt must be in the future." };
  }
  const maxExpiry = now.getTime() + SUPPORT_GRANT_MAX_TTL_MS;
  const expiresAt = new Date(Math.min(requested, maxExpiry)).toISOString();

  const grant: SupportAccessGrant = {
    id: input.id,
    targetType: input.targetType,
    targetTenantId: input.targetTenantId.trim(),
    justification,
    grantedByUserId: input.grantedByUserId.trim(),
    expiresAt,
    revokedAt: null,
  };

  if (!isSupportGrantValid(grant, now)) {
    return { ok: false, error: "Grant failed validation." };
  }

  return { ok: true, grant };
}

export function revokeSupportGrant(
  grant: SupportAccessGrant,
  now = new Date(),
): SupportAccessGrant {
  return { ...grant, revokedAt: now.toISOString() };
}
