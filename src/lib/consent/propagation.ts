/**
 * Erasure propagation to copies, subprocessors, and backups.
 */

import type { ErasurePropagationStep } from "@/lib/consent/types";

export function buildErasurePropagationPlan(
  mode: "delete" | "anonymize",
): ErasurePropagationStep[] {
  const at = new Date().toISOString();
  return [
    {
      target: "primary_store",
      status: "pending",
      detail: `Schedule ${mode} on primary application database / local workspace`,
      at,
    },
    {
      target: "document_storage",
      status: "pending",
      detail: `Schedule ${mode} on private document objects (soft-delete then purge)`,
      at,
    },
    {
      target: "community_copies",
      status: "pending",
      detail:
        "Revoke document_access grants and notify community portals to drop shared packet copies",
      at,
    },
    {
      target: "subprocessor",
      status: "pending",
      detail:
        "[LEGAL PLACEHOLDER] Notify subprocessors (email, analytics, hosting) per DPA — counsel to list processors.",
      at,
    },
    {
      target: "backups",
      status: "pending",
      detail:
        "Backups are immutable until retention expiry; erasure is effected by backup cycle expiry + restore controls that skip erased ids.",
      at,
    },
  ];
}

/**
 * Backup handling policy (operational description).
 * LEGAL PLACEHOLDER for counsel to align with vendor backup SLAs.
 */
export const BACKUP_ERASURE_POLICY = {
  summaryPlaceholder: `[LEGAL PLACEHOLDER]
1. Live stores: delete or anonymize per request when no legal hold applies.
2. Backups: not surgically edited; retain until backup_expire_at / vendor retention.
3. Restores: exclusion list of erased account/document ids must be applied before re-materializing data.
4. After backup expiry, no recoverable copy remains under Haven control except where a legal hold archive applies.`,
  defaultBackupRetainDays: Number(process.env.RETENTION_BACKUP_DAYS || 90),
};
