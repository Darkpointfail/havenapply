/** Shared B2C family domain types (API + UI adapters). */

import type { CareNeeds } from "@/lib/care-needs";
import type { VaultDocument } from "@/lib/document-vault";
import type { FamilyApplication } from "@/lib/family-applications";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { OnboardingMeta, SeniorProfile } from "@/lib/senior-profile";
import type { SavedFavorite } from "@/lib/saved-communities";

export const PROFILE_RETENTION_CONSENT_VERSION = "2026-08-loi25-v1";
export const PROFILE_RETENTION_PURPOSE_TEXT =
  "I consent to HavenApply creating and retaining my family profile and the senior's file to help me in my residence search. This consent does not authorize transmitting the file to a residence.";

export type ConsentPurpose = "profile_retention" | "dossier_transmission";

export type ConsentRecordDto = {
  id: string;
  purpose: ConsentPurpose;
  granted: boolean;
  version: string;
  purposeText: string;
  recordedAt: string;
  revokedAt: string | null;
};

export type EmergencyContactDto = {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ApplicantIdentity = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationshipToSenior: string;
  communicationPreference: string;
  preferredLanguage: string;
};

export type DeletionRequestDto = {
  id: string;
  scope: "profile" | "account";
  status: "pending" | "processing" | "completed" | "cancelled";
  reason: string;
  requestedAt: string;
};

export type ProfileProgress = {
  percent: number;
  sections: {
    id: string;
    label: string;
    complete: boolean;
    weight: number;
  }[];
  missingDocuments: { category: string; label: string }[];
  lastSavedAt: string | null;
  resumeStep: number;
};

export type FamilyAccountRecord = {
  id: string;
  ownerId: string;
  applicant: ApplicantIdentity;
  onboarding: OnboardingMeta;
  profileConsent: ConsentRecordDto | null;
  deletionRequest: DeletionRequestDto | null;
  createdAt: string;
  updatedAt: string;
};

export type SeniorRecord = {
  id: string;
  familyId: string;
  profile: SeniorProfile;
  careNeeds: CareNeeds;
  residentDossier: ResidentDossier;
  emergencyContacts: EmergencyContactDto[];
  completedPercentage: number;
  createdAt: string;
  updatedAt: string;
};

export type FamilyBundle = {
  account: FamilyAccountRecord;
  seniors: SeniorRecord[];
  documents: VaultDocument[];
  applications: FamilyApplication[];
  savedFavorites: SavedFavorite[];
  compareIds: string[];
  consents: ConsentRecordDto[];
  progress: ProfileProgress;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";
