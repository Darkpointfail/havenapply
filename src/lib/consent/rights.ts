/**
 * Data subject rights: access, rectification, structured export,
 * erasure/anonymization with legal-hold blocking and propagation.
 */

import type {
  ConsentGovernanceWorkspace,
  ConsentRecordV2,
  DataCategory,
  ErasurePropagationStep,
  ErasureRequest,
  LegalHold,
  RectificationRequest,
  StructuredExportManifest,
} from "@/lib/consent/types";
import { LEGAL_PLACEHOLDER_BANNER } from "@/lib/consent/policy-versions";
import { buildErasurePropagationPlan } from "@/lib/consent/propagation";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function activeLegalHolds(ws: ConsentGovernanceWorkspace): LegalHold[] {
  return ws.legalHolds.filter((h) => !h.releasedAt);
}

export function categoriesUnderLegalHold(ws: ConsentGovernanceWorkspace): Set<DataCategory> {
  const set = new Set<DataCategory>();
  for (const h of activeLegalHolds(ws)) {
    for (const c of h.dataCategories) set.add(c);
  }
  return set;
}

export function placeLegalHold(
  ws: ConsentGovernanceWorkspace,
  input: {
    reasonPlaceholder: string;
    placedBy: string;
    dataCategories: DataCategory[];
  },
): ConsentGovernanceWorkspace {
  const hold: LegalHold = {
    id: id("hold"),
    reasonPlaceholder: `${LEGAL_PLACEHOLDER_BANNER} ${input.reasonPlaceholder}`,
    placedAt: new Date().toISOString(),
    placedBy: input.placedBy,
    releasedAt: null,
    dataCategories: input.dataCategories,
  };
  return {
    ...ws,
    legalHolds: [hold, ...ws.legalHolds],
    updatedAt: new Date().toISOString(),
  };
}

export function releaseLegalHold(
  ws: ConsentGovernanceWorkspace,
  holdId: string,
): ConsentGovernanceWorkspace {
  return {
    ...ws,
    legalHolds: ws.legalHolds.map((h) =>
      h.id === holdId ? { ...h, releasedAt: new Date().toISOString() } : h,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/** Access / portability: structured export package (JSON). */
export function buildStructuredExport(input: {
  account: Record<string, unknown>;
  consentRecords: ConsentRecordV2[];
  familyData?: unknown;
  privacyLegacy?: unknown;
}): { json: string; manifest: StructuredExportManifest } {
  const requestedAt = new Date().toISOString();
  const exportId = id("export");
  const payload = {
    exportId,
    requestedAt,
    format: "json" as const,
    disclaimerPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
This export is a structured machine-readable copy of data available to the account.
Counsel must validate completeness claims and notices before production use.`,
    account: input.account,
    consentGovernance: input.consentRecords,
    familyData: input.familyData ?? null,
    privacyLegacy: input.privacyLegacy ?? null,
  };
  const manifest: StructuredExportManifest = {
    exportId,
    requestedAt,
    completedAt: new Date().toISOString(),
    format: "json",
    sections: ["account", "consentGovernance", "familyData", "privacyLegacy"],
    disclaimerPlaceholder: payload.disclaimerPlaceholder,
  };
  return { json: JSON.stringify({ manifest, data: payload }, null, 2), manifest };
}

export function requestRectification(
  ws: ConsentGovernanceWorkspace,
  input: { fieldPath: string; requestedValueSummary: string; note?: string },
): ConsentGovernanceWorkspace {
  const req: RectificationRequest = {
    id: id("rect"),
    requestedAt: new Date().toISOString(),
    fieldPath: input.fieldPath.slice(0, 200),
    requestedValueSummary: input.requestedValueSummary.slice(0, 500),
    status: "pending",
    completedAt: null,
    note: (input.note || "").slice(0, 500),
  };
  return {
    ...ws,
    rectifications: [req, ...ws.rectifications],
    updatedAt: new Date().toISOString(),
  };
}

export function completeRectification(
  ws: ConsentGovernanceWorkspace,
  requestId: string,
  status: "completed" | "rejected",
): ConsentGovernanceWorkspace {
  return {
    ...ws,
    rectifications: ws.rectifications.map((r) =>
      r.id === requestId
        ? { ...r, status, completedAt: new Date().toISOString() }
        : r,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Erasure request — blocked when a legal hold covers required categories.
 * Otherwise opens a propagation plan (primary, copies, subprocessors, backups).
 */
export function requestErasure(
  ws: ConsentGovernanceWorkspace,
  mode: "delete" | "anonymize",
  categories: DataCategory[] = [
    "account_profile",
    "senior_dossier",
    "documents",
    "applications",
    "messages",
    "analytics_events",
  ],
): { workspace: ConsentGovernanceWorkspace; request: ErasureRequest } {
  const held = categoriesUnderLegalHold(ws);
  const blocked = categories.filter((c) => held.has(c));
  const at = new Date().toISOString();

  if (blocked.length > 0) {
    const request: ErasureRequest = {
      id: id("erase"),
      requestedAt: at,
      mode,
      status: "blocked_legal_hold",
      blockedReasonPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Erasure incompatible with an active legal obligation / hold covering: ${blocked.join(", ")}.
Counsel must define hold scope and release criteria.`,
      propagation: [],
      completedAt: null,
    };
    return {
      request,
      workspace: {
        ...ws,
        erasureRequests: [request, ...ws.erasureRequests],
        updatedAt: at,
      },
    };
  }

  const propagation: ErasurePropagationStep[] = buildErasurePropagationPlan(mode);
  const request: ErasureRequest = {
    id: id("erase"),
    requestedAt: at,
    mode,
    status: "propagating",
    blockedReasonPlaceholder: null,
    propagation,
    completedAt: null,
  };
  return {
    request,
    workspace: {
      ...ws,
      erasureRequests: [request, ...ws.erasureRequests],
      updatedAt: at,
    },
  };
}

export function advanceErasurePropagation(
  ws: ConsentGovernanceWorkspace,
  requestId: string,
): ConsentGovernanceWorkspace {
  return {
    ...ws,
    erasureRequests: ws.erasureRequests.map((r) => {
      if (r.id !== requestId || r.status !== "propagating") return r;
      const nextSteps = r.propagation.map((step) => {
        if (step.status === "completed" || step.status === "deferred_backup_cycle") {
          return step;
        }
        if (step.target === "backups") {
          return {
            ...step,
            status: "deferred_backup_cycle" as const,
            detail:
              "Backup copies expire on the next retention cycle; not live-purged immediately.",
            at: new Date().toISOString(),
          };
        }
        return {
          ...step,
          status: "completed" as const,
          detail: `Propagated ${r.mode} to ${step.target}`,
          at: new Date().toISOString(),
        };
      });
      const pending = nextSteps.some(
        (s) => s.status === "pending" || s.status === "notified",
      );
      return {
        ...r,
        propagation: nextSteps,
        status: pending ? "propagating" : "completed",
        completedAt: pending ? null : new Date().toISOString(),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}

/** Anonymize a consent subject display fields while keeping evidence structure. */
export function anonymizeConsentRecord(record: ConsentRecordV2): ConsentRecordV2 {
  return {
    ...record,
    subjectDisplayName: "[anonymized]",
    consenterDisplayName: "[anonymized]",
    consenterEmail: `anonymized-${record.id.slice(0, 8)}@invalid.example`,
    history: [
      {
        id: id("ch"),
        at: new Date().toISOString(),
        type: "rectified_subject",
        actorUserId: "system",
        actorDisplayName: "system",
        detail: "Subject identifiers anonymized under erasure request",
      },
      ...record.history,
    ],
  };
}
