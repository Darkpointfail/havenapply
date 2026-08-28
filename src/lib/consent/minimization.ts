/**
 * Data minimization policy (operational — not legal advice).
 */

import type { DataCategory } from "@/lib/consent/types";

export type MinimizationRule = {
  dataCategory: DataCategory;
  /** Fields/collections that must not be collected without an active purpose */
  collectOnlyWithPurpose: string[];
  /** Prefer not to store indefinitely */
  minimizeInstruction: string;
};

export const MINIMIZATION_POLICY: MinimizationRule[] = [
  {
    dataCategory: "account_profile",
    collectOnlyWithPurpose: ["account_operation"],
    minimizeInstruction:
      "Collect only identity fields needed to authenticate and contact the account holder.",
  },
  {
    dataCategory: "senior_dossier",
    collectOnlyWithPurpose: ["admissions_application", "document_sharing"],
    minimizeInstruction:
      "Collect clinical/financial fields only when needed for an admissions workflow; hide unused sections by default.",
  },
  {
    dataCategory: "documents",
    collectOnlyWithPurpose: ["document_sharing", "admissions_application"],
    minimizeInstruction:
      "Store only attached documents; do not duplicate into public buckets; share per establishment grant.",
  },
  {
    dataCategory: "applications",
    collectOnlyWithPurpose: ["admissions_application"],
    minimizeInstruction:
      "Transmit only fields the family included in the packet for that community.",
  },
  {
    dataCategory: "messages",
    collectOnlyWithPurpose: ["community_messaging"],
    minimizeInstruction: "Retain message bodies only while the conversation purpose remains active.",
  },
  {
    dataCategory: "analytics_events",
    collectOnlyWithPurpose: ["analytics_improvement"],
    minimizeInstruction: "No analytics without opt-in; prefer aggregated events without direct identifiers.",
  },
  {
    dataCategory: "consent_records",
    collectOnlyWithPurpose: ["account_operation"],
    minimizeInstruction:
      "Retain consent evidence for accountability; do not store unnecessary free-text beyond placeholders.",
  },
  {
    dataCategory: "access_logs",
    collectOnlyWithPurpose: ["account_operation"],
    minimizeInstruction: "Log actions and resource ids; avoid raw document contents in logs.",
  },
];

export function assertPurposeAllowsCollection(
  dataCategory: DataCategory,
  activePurposeIds: string[],
): boolean {
  const rule = MINIMIZATION_POLICY.find((r) => r.dataCategory === dataCategory);
  if (!rule) return false;
  return rule.collectOnlyWithPurpose.some((p) => activePurposeIds.includes(p));
}
