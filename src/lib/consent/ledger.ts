/**
 * Verifiable consent ledger — grant, withdraw, amend, transmit establishments.
 * No purpose is accepted unless explicitly passed as true by the caller.
 */

import { POLICY_BUNDLE_VERSION_ID } from "@/lib/consent/policy-versions";
import { CONSENT_PURPOSES, purposeDef } from "@/lib/consent/purposes";
import type {
  AcceptedPurpose,
  AuthorityProof,
  ConsentGovernanceWorkspace,
  ConsentHistoryEntry,
  ConsentPurposeId,
  ConsentRecordV2,
  ConsentSubjectRole,
  TransmittedEstablishment,
} from "@/lib/consent/types";
import {
  abandonedApplicationExpireDays,
  defaultRetentionPolicies,
} from "@/lib/consent/retention";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyGovernanceWorkspace(): ConsentGovernanceWorkspace {
  return {
    version: 2,
    policyBundleVersionId: POLICY_BUNDLE_VERSION_ID,
    records: [],
    retention: defaultRetentionPolicies(),
    legalHolds: [],
    rectifications: [],
    erasureRequests: [],
    exports: [],
    abandonedApplicationExpireDays: abandonedApplicationExpireDays(),
    updatedAt: new Date().toISOString(),
  };
}

/** Build purpose rows — all start unaccepted unless listed in acceptedPurposeIds. */
export function buildPurposes(
  acceptedPurposeIds: ConsentPurposeId[],
  at: string,
): AcceptedPurpose[] {
  const accepted = new Set(acceptedPurposeIds);
  return CONSENT_PURPOSES.map((p) => ({
    purposeId: p.id,
    category: p.category,
    policyVersionId: p.policyVersionId,
    accepted: accepted.has(p.id),
    acceptedAt: accepted.has(p.id) ? at : null,
  }));
}

export function grantConsent(input: {
  subjectDisplayName: string;
  subjectRoleHint: ConsentSubjectRole;
  consenterDisplayName: string;
  consenterEmail: string;
  consenterUserId: string;
  consenterRole: ConsentSubjectRole;
  /** Only purposes the user explicitly checked */
  acceptedPurposeIds: ConsentPurposeId[];
  contextSurface: string;
  expiresAt?: string | null;
  authorityProof?: AuthorityProof | null;
  userAgentHint?: string;
}): ConsentRecordV2 {
  if (input.acceptedPurposeIds.length === 0) {
    throw new Error("At least one purpose must be explicitly accepted");
  }
  // Guard: never silently accept optional purposes
  for (const pid of input.acceptedPurposeIds) {
    purposeDef(pid);
  }

  const at = new Date().toISOString();
  const purposes = buildPurposes(input.acceptedPurposeIds, at);
  const history: ConsentHistoryEntry = {
    id: id("ch"),
    at,
    type: "granted",
    actorUserId: input.consenterUserId,
    actorDisplayName: input.consenterDisplayName,
    detail: `Granted purposes: ${input.acceptedPurposeIds.join(", ")}`,
    purposesSnapshot: Object.fromEntries(purposes.map((p) => [p.purposeId, p.accepted])),
  };

  const needsAuthority =
    input.consenterRole === "legal_representative" ||
    (input.consenterRole !== "resident" &&
      input.subjectRoleHint === "resident" &&
      input.consenterRole !== "caregiver");

  if (needsAuthority && input.consenterRole === "legal_representative") {
    if (!input.authorityProof || input.authorityProof.kind === "none") {
      throw new Error("Legal representative consent requires authority proof");
    }
  }

  return {
    id: id("consent"),
    subjectDisplayName: input.subjectDisplayName,
    subjectRoleHint: input.subjectRoleHint,
    consenterDisplayName: input.consenterDisplayName,
    consenterEmail: input.consenterEmail.toLowerCase(),
    consenterUserId: input.consenterUserId,
    consenterRole: input.consenterRole,
    policyBundleVersionId: POLICY_BUNDLE_VERSION_ID,
    purposes,
    context: {
      surface: input.contextSurface,
      userAgentHint: input.userAgentHint,
    },
    grantedAt: at,
    expiresAt: input.expiresAt ?? null,
    withdrawnAt: null,
    withdrawalReason: null,
    authorityProof: input.authorityProof ?? null,
    establishments: [],
    active: true,
    history: [history],
  };
}

export function withdrawConsent(
  record: ConsentRecordV2,
  actor: { userId: string; displayName: string },
  reason: string,
): ConsentRecordV2 {
  const at = new Date().toISOString();
  const purposes = record.purposes.map((p) => ({
    ...p,
    accepted: false,
    acceptedAt: p.acceptedAt,
  }));
  return {
    ...record,
    active: false,
    withdrawnAt: at,
    withdrawalReason: reason.slice(0, 500),
    purposes,
    history: [
      {
        id: id("ch"),
        at,
        type: "withdrawn",
        actorUserId: actor.userId,
        actorDisplayName: actor.displayName,
        detail: reason.slice(0, 500),
        purposesSnapshot: Object.fromEntries(purposes.map((p) => [p.purposeId, false])),
      },
      ...record.history,
    ],
  };
}

export function amendPurposes(
  record: ConsentRecordV2,
  actor: { userId: string; displayName: string },
  nextAcceptedIds: ConsentPurposeId[],
): ConsentRecordV2 {
  if (!record.active) throw new Error("Cannot amend a withdrawn consent; grant a new record");
  const at = new Date().toISOString();
  const purposes = buildPurposes(nextAcceptedIds, at);
  // Preserve original acceptedAt for purposes that remain accepted
  const prev = new Map(record.purposes.map((p) => [p.purposeId, p]));
  const merged = purposes.map((p) => {
    const old = prev.get(p.purposeId);
    if (p.accepted && old?.accepted && old.acceptedAt) {
      return { ...p, acceptedAt: old.acceptedAt };
    }
    return p;
  });
  return {
    ...record,
    purposes: merged,
    history: [
      {
        id: id("ch"),
        at,
        type: "amended",
        actorUserId: actor.userId,
        actorDisplayName: actor.displayName,
        detail: `Amended purposes: ${nextAcceptedIds.join(", ") || "(none)"}`,
        purposesSnapshot: Object.fromEntries(merged.map((p) => [p.purposeId, p.accepted])),
      },
      ...record.history,
    ],
  };
}

export function recordEstablishmentTransmission(
  record: ConsentRecordV2,
  establishment: Omit<TransmittedEstablishment, "transmittedAt"> & { transmittedAt?: string },
  actor: { userId: string; displayName: string },
): ConsentRecordV2 {
  if (!record.active) throw new Error("Cannot transmit under withdrawn consent");
  const required = establishment.purposeIds;
  for (const pid of required) {
    const row = record.purposes.find((p) => p.purposeId === pid);
    if (!row?.accepted) {
      throw new Error(`Purpose ${pid} not accepted — cannot transmit to establishment`);
    }
  }
  const at = establishment.transmittedAt || new Date().toISOString();
  const entry: TransmittedEstablishment = {
    establishmentId: establishment.establishmentId,
    establishmentName: establishment.establishmentName,
    transmittedAt: at,
    applicationId: establishment.applicationId,
    purposeIds: establishment.purposeIds,
  };
  return {
    ...record,
    establishments: [entry, ...record.establishments],
    history: [
      {
        id: id("ch"),
        at,
        type: "amended",
        actorUserId: actor.userId,
        actorDisplayName: actor.displayName,
        detail: `Transmitted to establishment ${establishment.establishmentId}`,
      },
      ...record.history,
    ],
  };
}

export function expireConsentIfNeeded(
  record: ConsentRecordV2,
  now = new Date(),
): ConsentRecordV2 {
  if (!record.active || !record.expiresAt) return record;
  if (new Date(record.expiresAt).getTime() > now.getTime()) return record;
  const at = now.toISOString();
  return {
    ...record,
    active: false,
    withdrawnAt: at,
    withdrawalReason: "expired",
    history: [
      {
        id: id("ch"),
        at,
        type: "expired",
        actorUserId: "system",
        actorDisplayName: "system",
        detail: "Consent expired by configured duration",
      },
      ...record.history,
    ],
  };
}

export function hasAcceptedPurpose(
  record: ConsentRecordV2,
  purposeId: ConsentPurposeId,
): boolean {
  if (!record.active) return false;
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) return false;
  return !!record.purposes.find((p) => p.purposeId === purposeId && p.accepted);
}
