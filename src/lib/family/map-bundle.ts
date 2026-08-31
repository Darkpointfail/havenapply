import { emptyCareNeeds } from "@/lib/care-needs";
import { emptyResidentDossier } from "@/lib/resident-dossier";
import { emptyOnboardingMeta, emptySeniorProfile, seniorAge, seniorDisplayName } from "@/lib/senior-profile";
import type { FamilyApplication } from "@/lib/family-applications";
import type { CareNeeds } from "@/lib/care-needs";
import type { VaultDocument, DocumentRequest } from "@/lib/document-vault";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { OnboardingMeta, SeniorProfile } from "@/lib/senior-profile";
import type { SavedFavorite } from "@/lib/saved-communities";
import type { FamilyBundle } from "@/lib/family/types";

type ProfilePerson = {
  name: string;
  age: string;
  preferredName: string;
  relationship: string;
};

type ProfileSection = {
  id: string;
  title: string;
  summary: string;
  items: string[];
};

export type FamilyDataMapped = {
  person: ProfilePerson;
  senior: SeniorProfile;
  onboarding: OnboardingMeta;
  seniorCreated: boolean;
  careNeeds: CareNeeds;
  residentDossier: ResidentDossier;
  sections: ProfileSection[];
  documents: VaultDocument[];
  documentRequests: DocumentRequest[];
  savedFavorites: SavedFavorite[];
  compareIds: string[];
  applications: FamilyApplication[];
  personRef?: string | null;
  dossierRef?: string | null;
};

const SECTION_DEFS: { id: string; title: string }[] = [
  { id: "general", title: "General health" },
  { id: "conditions", title: "Conditions" },
  { id: "medications", title: "Medications" },
  { id: "allergies", title: "Allergies" },
  { id: "vaccinations", title: "Vaccinations" },
  { id: "mobility", title: "Mobility" },
  { id: "cognitive", title: "Cognitive assessment" },
  { id: "care", title: "Care requirements" },
  { id: "insurance", title: "Insurance" },
  { id: "emergency", title: "Emergency contacts" },
];

function personFromSenior(senior: ReturnType<typeof emptySeniorProfile>): ProfilePerson {
  return {
    name: seniorDisplayName(senior),
    age: seniorAge(senior),
    preferredName: senior.firstName,
    relationship: senior.relationship,
  };
}

export function emptyFamilyDataLocal(): FamilyDataMapped {
  const senior = emptySeniorProfile();
  return {
    person: personFromSenior(senior),
    senior,
    onboarding: emptyOnboardingMeta(),
    seniorCreated: false,
    careNeeds: emptyCareNeeds(),
    residentDossier: emptyResidentDossier(),
    sections: SECTION_DEFS.map((s) => ({
      ...s,
      summary: "Nothing added yet",
      items: [],
    })),
    documents: [],
    documentRequests: [],
    savedFavorites: [],
    compareIds: [],
    applications: [],
    personRef: null,
    dossierRef: null,
  };
}

export function bundleToFamilyData(bundle: FamilyBundle): FamilyDataMapped {
  const primary = bundle.seniors[0];
  const senior = primary?.profile ?? emptySeniorProfile();
  const emergencyItems = (primary?.emergencyContacts || [])
    .filter((c) => c.fullName)
    .map((c) => [c.fullName, c.relationship, c.phone].filter(Boolean).join(", "));

  const sections: ProfileSection[] = SECTION_DEFS.map((s) => {
    if (s.id === "emergency") {
      return {
        ...s,
        summary: emergencyItems.length ? `${emergencyItems.length} contact(s)` : "Nothing added yet",
        items: emergencyItems,
      };
    }
    return { ...s, summary: "Nothing added yet", items: [] };
  });

  return {
    person: personFromSenior(senior),
    senior,
    onboarding: bundle.account.onboarding,
    seniorCreated: Boolean(senior.firstName && senior.lastName),
    careNeeds: primary?.careNeeds ?? emptyCareNeeds(),
    residentDossier: primary?.residentDossier ?? emptyResidentDossier(),
    sections,
    documents: bundle.documents,
    documentRequests: [],
    savedFavorites: bundle.savedFavorites,
    compareIds: bundle.compareIds,
    applications: bundle.applications,
    personRef: null,
    dossierRef: null,
  };
}
