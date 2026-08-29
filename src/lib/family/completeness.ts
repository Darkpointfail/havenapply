import type { CareNeeds } from "@/lib/care-needs";
import { RECOMMENDED_CHECKLIST, type VaultDocument } from "@/lib/document-vault";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { SeniorProfile } from "@/lib/senior-profile";
import type { EmergencyContactDto, ProfileProgress } from "@/lib/family/types";

function hasText(v: string | null | undefined) {
  return Boolean(v && String(v).trim());
}

function applicantSectionComplete(senior: SeniorProfile) {
  return hasText(senior.relationship) || hasText(senior.filledBy);
}

function identitySectionComplete(senior: SeniorProfile) {
  return (
    hasText(senior.firstName) &&
    hasText(senior.lastName) &&
    hasText(senior.dateOfBirth) &&
    hasText(senior.city)
  );
}

function livingSectionComplete(senior: SeniorProfile) {
  return hasText(senior.livingSituation) && hasText(senior.urgency);
}

function housingSectionComplete(senior: SeniorProfile) {
  return senior.housingTypes.length > 0;
}

function locationSectionComplete(senior: SeniorProfile) {
  return senior.searchZones.some((z) => hasText(z.query));
}

function budgetSectionComplete(senior: SeniorProfile) {
  if (senior.budgetUnsure) return true;
  return hasText(senior.budgetMin) || hasText(senior.budgetMax) || senior.fundingModes.length > 0;
}

function careNeedsComplete(care: CareNeeds) {
  return Boolean(care.completedAt) || care.mobility.length > 0 || care.cognition.length > 0;
}

function emergencyComplete(contacts: EmergencyContactDto[], dossier: ResidentDossier) {
  if (contacts.some((c) => hasText(c.fullName) && hasText(c.phone))) return true;
  const ec = dossier.emergencyContact;
  return hasText(ec?.name) && hasText(ec?.phone);
}

function requiredDocsMissing(documents: VaultDocument[]) {
  const present = new Set(documents.filter((d) => d.hasFile || d.status !== "rejected").map((d) => d.category));
  return RECOMMENDED_CHECKLIST.filter((c) => c.priority === "required" && !present.has(c.category)).map(
    (c) => ({ category: c.category, label: c.label }),
  );
}

/**
 * Real completeness from persisted fields — never invents demo progress.
 */
export function computeProfileProgress(input: {
  senior: SeniorProfile;
  careNeeds: CareNeeds;
  residentDossier: ResidentDossier;
  emergencyContacts: EmergencyContactDto[];
  documents: VaultDocument[];
  lastSavedAt: string | null;
  resumeStep: number;
  hasProfileConsent: boolean;
}): ProfileProgress {
  const sections = [
    { id: "consent", label: "Consentement au profil", complete: input.hasProfileConsent, weight: 10 },
    { id: "applicant", label: "Identité du demandeur", complete: applicantSectionComplete(input.senior), weight: 10 },
    { id: "identity", label: "Profil de la personne aînée", complete: identitySectionComplete(input.senior), weight: 20 },
    { id: "living", label: "Situation et urgence", complete: livingSectionComplete(input.senior), weight: 10 },
    { id: "housing", label: "Type d'unité recherché", complete: housingSectionComplete(input.senior), weight: 10 },
    { id: "location", label: "Régions recherchées", complete: locationSectionComplete(input.senior), weight: 10 },
    { id: "budget", label: "Budget", complete: budgetSectionComplete(input.senior), weight: 10 },
    { id: "care", label: "Besoins et préférences", complete: careNeedsComplete(input.careNeeds), weight: 10 },
    {
      id: "emergency",
      label: "Coordonnées d'urgence",
      complete: emergencyComplete(input.emergencyContacts, input.residentDossier),
      weight: 5,
    },
    {
      id: "documents",
      label: "Documents requis",
      complete: requiredDocsMissing(input.documents).length === 0 && input.documents.length > 0,
      weight: 5,
    },
  ];

  const totalWeight = sections.reduce((s, x) => s + x.weight, 0);
  const earned = sections.reduce((s, x) => s + (x.complete ? x.weight : 0), 0);
  const percent = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);

  return {
    percent,
    sections,
    missingDocuments: requiredDocsMissing(input.documents),
    lastSavedAt: input.lastSavedAt,
    resumeStep: input.resumeStep,
  };
}
