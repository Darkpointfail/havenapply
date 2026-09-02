import type { Residence } from "@/data/residences";
import type { VaultDocument } from "@/lib/document-vault";
import {
  APPLY_REQUIRED_DOCS,
  communityQuestions,
  requirementGaps,
  type FamilyApplication,
} from "@/lib/family-applications";
import { computeCompatibility } from "@/lib/community-match";
import type { CareNeeds } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";

export const MULTI_APPLY_MAX = 5;

export const MULTI_APPLY_STEPS = [
  { id: "select", title: "Select communities", short: "Select" },
  { id: "common", title: "Shared requirements", short: "Shared" },
  { id: "prepare", title: "Prepare each application", short: "Prepare" },
  { id: "board", title: "Readiness board", short: "Board" },
  { id: "summaries", title: "Per-destination summary", short: "Summaries" },
  { id: "confirm", title: "Confirm & send", short: "Send" },
  { id: "done", title: "Tracking", short: "Done" },
] as const;

export type PrepStatus = "ready" | "needs_info" | "blocked" | "already_sent";

export type DestinationPrep = {
  residence: Residence;
  draft: FamilyApplication;
  matchScore: number;
  completeness: number;
  prepStatus: PrepStatus;
  commonDocIds: string[];
  specificDocLabels: string[];
  remainingQuestions: string[];
  incompatibilities: string[];
  missingSharedDocs: string[];
};

/** Document category labels required by every selected community */
export function commonRequirementLabels(residences: Residence[]): string[] {
  if (!residences.length) return [];
  const sets = residences.map((r) => new Set(requirementGaps(r, [], false).documents));
  const first = [...sets[0]];
  return first.filter((doc) => sets.every((s) => s.has(doc)));
}

/** Extra forms / docs that are not shared across all */
export function specificRequirements(residence: Residence, all: Residence[]) {
  const common = new Set(commonRequirementLabels(all));
  const gaps = requirementGaps(residence, [], false);
  return {
    documents: gaps.documents.filter((d) => !common.has(d)),
    forms: gaps.extraForms,
    criteria: gaps.criteria,
    fees: gaps.fees,
    notAccepted: gaps.notAccepted,
  };
}

export function sharedDocCategoriesPresent(docs: VaultDocument[]) {
  return APPLY_REQUIRED_DOCS.filter((req) =>
    docs.some((d) => d.category === req.category),
  ).map((r) => r.category);
}

export function computeDestinationPrep(
  residence: Residence,
  draft: FamilyApplication,
  allSelected: Residence[],
  vault: VaultDocument[],
  senior: SeniorProfile | null,
  care: CareNeeds | null,
  alreadySent: boolean,
): DestinationPrep {
  const attached = vault.filter((d) => draft.attachedDocumentIds.includes(d.id));
  const cats = attached.map((d) => d.category);
  const memory =
    care?.cognition?.some((c) =>
      ["dementia", "alzheimers", "wandering", "secure", "sundowning"].includes(c),
    ) ?? false;
  const gaps = requirementGaps(residence, cats, memory);
  const specific = specificRequirements(residence, allSelected);
  const questions = communityQuestions(residence.id);
  const remainingQuestions = questions
    .filter((q) => q.required && !draft.specificAnswers[q.id]?.trim())
    .map((q) => q.label);

  const commonLabels = commonRequirementLabels(allSelected);
  const missingSharedDocs = APPLY_REQUIRED_DOCS.filter((req) => {
    const inCommonAsk = commonLabels.some((l) =>
      l.toLowerCase().includes(req.label.split(" ")[0].toLowerCase()),
    );
    // Always check core shared checklist
    const isCore = ["identification", "insurance_card", "physician_report", "medication_list"].includes(
      req.category,
    );
    if (!isCore && !inCommonAsk) return false;
    return !cats.includes(req.category);
  }).map((r) => r.label);

  let score = 35;
  if (draft.desiredMoveIn.trim()) score += 10;
  if (draft.consentShare && draft.consentAccurate) score += 15;
  if (draft.signatureName.trim().length >= 2) score += 10;
  score += Math.min(20, attached.length * 5);
  score -= remainingQuestions.length * 8;
  score -= gaps.incompatibilities.length * 6;
  score -= Math.min(15, missingSharedDocs.length * 5);
  score = Math.max(5, Math.min(100, score));

  let prepStatus: PrepStatus = "ready";
  if (alreadySent) prepStatus = "already_sent";
  else if (gaps.incompatibilities.length >= 2 && remainingQuestions.length > 0)
    prepStatus = "blocked";
  else if (
    remainingQuestions.length > 0 ||
    missingSharedDocs.length > 0 ||
    !draft.consentShare ||
    !draft.signatureName.trim()
  )
    prepStatus = "needs_info";

  const match = computeCompatibility(residence, senior, care);

  return {
    residence,
    draft,
    matchScore: match.score,
    completeness: score,
    prepStatus,
    commonDocIds: draft.attachedDocumentIds.filter((id) => {
      const doc = vault.find((d) => d.id === id);
      return doc && ["identification", "insurance_card", "physician_report", "medication_list"].includes(doc.category);
    }),
    specificDocLabels: specific.documents.concat(specific.forms),
    remainingQuestions,
    incompatibilities: gaps.incompatibilities,
    missingSharedDocs,
  };
}

export function prepStatusLabel(s: PrepStatus) {
  switch (s) {
    case "ready":
      return "Ready to send";
    case "needs_info":
      return "Needs information";
    case "blocked":
      return "Review incompatibilities";
    case "already_sent":
      return "Already submitted";
  }
}
