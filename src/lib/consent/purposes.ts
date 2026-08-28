/**
 * Consent purposes — essential vs optional.
 * UI must never pre-check any purpose. Essential purposes are required to use
 * a feature but still require an explicit affirmative action.
 */

import type { ConsentPurposeId, PurposeCategory } from "@/lib/consent/types";

export type PurposeDefinition = {
  id: ConsentPurposeId;
  category: PurposeCategory;
  /** Short UI label (not legal text) */
  uiLabel: string;
  /** LEGAL PLACEHOLDER summary for counsel */
  summaryPlaceholder: string;
  policyVersionId: string;
  /** If true, feature cannot proceed without this purpose accepted */
  requiredForFeature?: "signup" | "apply" | "share_documents" | "message";
};

export const CONSENT_PURPOSES: PurposeDefinition[] = [
  {
    id: "account_operation",
    category: "essential",
    uiLabel: "Operate my account",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Essential processing to create and secure the account.",
    policyVersionId: "purpose-account-v0.1-draft",
    requiredForFeature: "signup",
  },
  {
    id: "admissions_application",
    category: "essential",
    uiLabel: "Submit admissions application materials",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Essential when applying: send selected dossier fields to chosen communities.",
    policyVersionId: "purpose-admissions-v0.1-draft",
    requiredForFeature: "apply",
  },
  {
    id: "document_sharing",
    category: "essential",
    uiLabel: "Share selected documents with communities",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Share only documents the user attaches to an application.",
    policyVersionId: "purpose-docshare-v0.1-draft",
    requiredForFeature: "share_documents",
  },
  {
    id: "community_messaging",
    category: "optional",
    uiLabel: "Message selected communities",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Optional messaging related to applications.",
    policyVersionId: "purpose-messaging-v0.1-draft",
    requiredForFeature: "message",
  },
  {
    id: "product_updates",
    category: "optional",
    uiLabel: "Product and service updates",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Optional product emails. Opt-in only.",
    policyVersionId: "purpose-product-v0.1-draft",
  },
  {
    id: "marketing_communications",
    category: "optional",
    uiLabel: "Marketing communications",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Optional marketing. Opt-in only. Never pre-checked.",
    policyVersionId: "purpose-marketing-v0.1-draft",
  },
  {
    id: "analytics_improvement",
    category: "optional",
    uiLabel: "Analytics to improve HavenApply",
    summaryPlaceholder:
      "[LEGAL PLACEHOLDER] Optional analytics. Opt-in only. Never pre-checked.",
    policyVersionId: "purpose-analytics-v0.1-draft",
  },
];

export function purposesByCategory(category: PurposeCategory): PurposeDefinition[] {
  return CONSENT_PURPOSES.filter((p) => p.category === category);
}

export function purposeDef(id: ConsentPurposeId): PurposeDefinition {
  const found = CONSENT_PURPOSES.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown purpose: ${id}`);
  return found;
}
