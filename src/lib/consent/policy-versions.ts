/**
 * Policy text versions — LEGAL PLACEHOLDERS ONLY.
 * Replace bodyPlaceholder content after attorney review. Do not treat as binding copy.
 */

import type { PolicyTextVersion } from "@/lib/consent/types";

export const LEGAL_PLACEHOLDER_BANNER =
  "[LEGAL PLACEHOLDER — pending attorney validation. Not final legal text.]";

export const POLICY_BUNDLE_VERSION_ID = "haven-policy-bundle-2026-08-19-draft";

export const POLICY_TEXT_VERSIONS: PolicyTextVersion[] = [
  {
    id: "terms-v0.1-draft",
    documentKey: "terms_of_use",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Terms of Use draft placeholder for HavenApply.
Counsel must supply: parties, eligibility, acceptable use, limitation of liability, governing law.`,
  },
  {
    id: "privacy-v0.1-draft",
    documentKey: "privacy_notice",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Privacy Notice draft placeholder for HavenApply.
Counsel must supply: controllers, processors, lawful bases, transfers, rights, contact.`,
  },
  {
    id: "purpose-account-v0.1-draft",
    documentKey: "purpose_account_operation",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Essential purpose: operate the user account and authenticate access. Counsel to finalize scope.`,
  },
  {
    id: "purpose-admissions-v0.1-draft",
    documentKey: "purpose_admissions_application",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Essential purpose when applying: transmit application materials to selected communities. Counsel to finalize.`,
  },
  {
    id: "purpose-docshare-v0.1-draft",
    documentKey: "purpose_document_sharing",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Optional/essential-context purpose: share specific documents with named communities. Counsel to finalize.`,
  },
  {
    id: "purpose-messaging-v0.1-draft",
    documentKey: "purpose_community_messaging",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Purpose: enable messaging with selected communities about an application. Counsel to finalize.`,
  },
  {
    id: "purpose-product-v0.1-draft",
    documentKey: "purpose_product_updates",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Optional purpose: product/service updates. Counsel to finalize; must remain opt-in.`,
  },
  {
    id: "purpose-marketing-v0.1-draft",
    documentKey: "purpose_marketing_communications",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Optional purpose: marketing communications. Counsel to finalize; must remain opt-in, never pre-checked.`,
  },
  {
    id: "purpose-analytics-v0.1-draft",
    documentKey: "purpose_analytics_improvement",
    version: "0.1-draft",
    effectiveFrom: "2026-08-19",
    language: "en",
    bodyPlaceholder: `${LEGAL_PLACEHOLDER_BANNER}
Optional purpose: product analytics/improvement. Counsel to finalize; must remain opt-in.`,
  },
];

export function getPolicyVersion(id: string): PolicyTextVersion | undefined {
  return POLICY_TEXT_VERSIONS.find((p) => p.id === id);
}

export function getPolicyByDocumentKey(documentKey: string): PolicyTextVersion | undefined {
  return POLICY_TEXT_VERSIONS.filter((p) => p.documentKey === documentKey).sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  )[0];
}
