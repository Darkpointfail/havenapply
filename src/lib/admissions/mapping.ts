/**
 * Server record <-> UI shapes.
 *
 * The community mapping reproduces, field for field, what the deleted
 * `mergeSharedIntoCommunityApps` produced, so the console renders exactly the
 * same markup from server data.
 */

import type { ApplicationStatus } from "@/data/applications";
import type { ClientDossier, CommunityApplication } from "@/lib/community-portal";
import type { FamilyApplication } from "@/lib/family-applications";
import { canonicalSeniorName, scrubDemoNamesDeep } from "@/lib/demo-name-fix";
import {
  computeDossierCompleteness,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import type {
  AdmissionApplicationRecord,
  AdmissionStatus,
  AdmissionSubmitInput,
} from "@/lib/admissions/types";

/** Community-side id kept stable so existing deep links keep resolving. */
export function communityAppIdFor(record: { id: string }) {
  return `capp-shared-${record.id}`;
}

export function applicationIdFromCommunityAppId(communityAppId: string): string | null {
  if (!communityAppId.startsWith("capp-shared-")) return null;
  return communityAppId.replace("capp-shared-", "");
}

export function admissionRecordToCommunityApplication(
  record: AdmissionApplicationRecord,
  prior?: CommunityApplication,
): CommunityApplication {
  const snapshot = record.dossierSnapshot;
  const dossierFromSnapshot: ClientDossier | undefined = snapshot
    ? {
        dateOfBirth: "",
        gender: "",
        primaryLanguage: snapshot.context.primaryLanguage,
        currentAddress: snapshot.context.currentAddress,
        currentLivingSituation: snapshot.context.currentLivingSituation,
        pathologies: [],
        medications: [],
        medicationNotes: snapshot.clinical.currentMedications,
        allergies: [
          snapshot.clinical.allergies,
          snapshot.clinical.medicationAllergies,
        ]
          .filter(Boolean)
          .map((substance) => ({ substance, reaction: "" })),
        previousFacilities: [],
        adls: Object.entries(snapshot.autonomy.adls).map(([activity, level]) => ({
          activity,
          level,
        })),
        mobilityAids: [
          snapshot.autonomy.mobility,
          ...snapshot.autonomy.mobilityDevices,
        ].filter(Boolean),
        diet: snapshot.autonomy.nutrition.join(" · "),
        continence: snapshot.autonomy.continence,
        cognitiveNotes: snapshot.autonomy.memoryCognition.join(" · "),
        primaryPhysician: snapshot.clinical.physician,
        physicianPhone: snapshot.clinical.physicianPhone,
        pharmacy: snapshot.clinical.pharmacy,
      }
    : undefined;

  return {
    id: communityAppIdFor(record),
    residenceId: record.siteId,
    publicRef: record.publicRef || prior?.publicRef || null,
    personRef: record.personRef || prior?.personRef || null,
    dossierRef: record.dossierRef || prior?.dossierRef || null,
    seniorName: canonicalSeniorName(record.senior.name),
    seniorAge: record.senior.age || 80,
    seniorPhotoUrl: record.senior.photoUrl || prior?.seniorPhotoUrl || null,
    relationship: record.senior.relationship,
    summary: scrubDemoNamesDeep(record.summary),
    careNeeds: record.careNeeds,
    medicalHighlights: record.medicalHighlights,
    documents: record.documents,
    family: {
      ...record.familyContact,
      preferredLanguage: record.familyContact.preferredLanguage ?? prior?.family?.preferredLanguage,
      preferredContactMethod:
        record.familyContact.preferredContactMethod ?? prior?.family?.preferredContactMethod,
      availability: record.familyContact.availability ?? prior?.family?.availability,
      decisionAuthority: record.familyContact.decisionAuthority ?? prior?.family?.decisionAuthority,
    },
    status: record.status as ApplicationStatus,
    careType: prior?.careType,
    referralSource: prior?.referralSource ?? "Family",
    priority: prior?.priority ?? "medium",
    executiveSummary: scrubDemoNamesDeep(prior?.executiveSummary ?? record.summary),
    insights: prior?.insights,
    dossier: dossierFromSnapshot ?? prior?.dossier,
    emergencyContact: snapshot?.emergencyContact
      ? {
          name: snapshot.emergencyContact.name,
          phone: snapshot.emergencyContact.phone,
          email: snapshot.emergencyContact.email,
          relationship: snapshot.emergencyContact.relationship,
        }
      : prior?.emergencyContact,
    secondaryContact: snapshot?.secondaryContact
      ? {
          name: snapshot.secondaryContact.name,
          phone: snapshot.secondaryContact.phone,
          email: snapshot.secondaryContact.email,
          relationship: snapshot.secondaryContact.relationship,
        }
      : prior?.secondaryContact,
    dossierCompleteness: snapshot?.completeness ?? prior?.dossierCompleteness,
    dossierLastUpdated: snapshot?.updatedAt ?? prior?.dossierLastUpdated,
    housingPreferences: snapshot?.housing ?? prior?.housingPreferences,
    communicationPreference:
      snapshot?.communicationPreference || prior?.communicationPreference,
    decisionAuthority: snapshot?.decisionAuthority || prior?.decisionAuthority,    paymentMethod: prior?.paymentMethod,
    moveInRequested: prior?.moveInRequested ?? record.desiredMoveIn ?? undefined,
    focusReason: prior?.focusReason,
    nextAction: prior?.nextAction,
    assigneeId: prior?.assigneeId ?? null,
    assigneeName: prior?.assigneeName ?? null,
    internalNotes: prior?.internalNotes ?? [],
    infoRequest: prior?.infoRequest ?? null,
    documentRequest: prior?.documentRequest ?? null,
    tourProposal: prior?.tourProposal ?? null,
    assessmentProposal: prior?.assessmentProposal ?? null,
    waitlistPosition: record.waitlistPosition,
    submittedAt: record.submittedAt ?? record.createdAt,
    lastUpdated: record.updatedAt,
    reviewChecklist: prior?.reviewChecklist,
    transitionChecklist: prior?.transitionChecklist,
    moveInConfirmed: prior?.moveInConfirmed,
    transitionWork: prior?.transitionWork,
    auditLog: prior?.auditLog?.length
      ? prior.auditLog
      : [
          {
            id: `aud-server-${record.id}`,
            at: record.submittedAt ?? record.createdAt,
            actor: "Haven",
            action: record.publicRef
              ? `Application received from family via Haven (${record.publicRef})`
              : "Application received from family via Haven",
          },
        ],
  };
}

/** Build the submit payload from a family application plus dossier context. */
export function admissionInputFromFamilyApplication(
  app: FamilyApplication,
  extras: {
    seniorName?: string;
    seniorAge?: number;
    relationship?: string;
    careNeeds?: string[];
    medicalHighlights?: string[];
    phone?: string;
    seniorPhotoUrl?: string | null;
    documentMeta?: { id: string; name: string; category: string; shared: boolean }[];
    summary?: string;
    residentDossier?: ResidentDossier;
    completionPercent?: number;
  } = {},
): AdmissionSubmitInput {
  const dossier = extras.residentDossier;
  const dossierCompleteness = dossier
    ? computeDossierCompleteness(dossier, extras.documentMeta ?? [])
    : null;
  return {
    // The family application id doubles as the idempotency key: resubmitting the
    // same application must never create a second record.
    clientRequestId: app.id,
    siteId: app.residenceId,
    siteName: app.residenceName,
    publicRef: app.publicRef ?? null,
    personRef: app.personRef ?? null,
    dossierRef: app.dossierRef ?? null,
    senior: {
      name: extras.seniorName ?? "",
      age: extras.seniorAge ?? null,
      relationship: extras.relationship ?? "",
      photoUrl: extras.seniorPhotoUrl ?? null,
    },
    summary: extras.summary ?? "",
    careNeeds: extras.careNeeds ?? [],
    medicalHighlights: extras.medicalHighlights ?? [],
    documents: extras.documentMeta ?? [],
    familyContact: {
      name: app.submittedByName || "",
      email: app.submittedByEmail || "",
      phone: extras.phone ?? "",
      relationship: extras.relationship || "Primary contact",
    },
    dossierSnapshot: dossier
      ? {
          updatedAt: dossier.lastSavedAt,
          completeness: {
            percent: extras.completionPercent ?? dossierCompleteness?.percent ?? 0,
            missingItems:
              dossierCompleteness?.sections.flatMap((section) => section.missing) ?? [],
            missingDocuments: dossierCompleteness?.missingDocs ?? [],
          },
          context: {
            currentAddress: [dossier.address, dossier.city, dossier.state]
              .filter(Boolean)
              .join(", "),
            currentLivingSituation:
              dossier.livingSituationOther || dossier.livingSituation,
            primaryLanguage: dossier.primaryLanguage,
            referralSource: "Déposée par la famille (HavenApply)",
          },
          housing: {
            communityTypes: dossier.communityTypes,
            preferredCities: dossier.preferredCities,
            roomPreference: dossier.roomPreference,
            specialPreferences: dossier.specialPreferences,
            specialPreferencesNotes: dossier.specialPreferencesNotes,
            budgetMin: dossier.budgetMin,
            budgetMax: dossier.budgetMax || dossier.maxMonthlyBudget,
          },
          autonomy: {
            level: dossier.autonomyLevel,
            mobility: dossier.mobility,
            mobilityDevices: dossier.mobilityDevices,
            adls: dossier.adls,
            continence: dossier.continence,
            memoryCognition: dossier.memoryCognition,
            nutrition: dossier.nutrition,
            specialCareNeeds: dossier.specialCareNeeds,
          },
          clinical: {
            diagnoses: dossier.diagnoses,
            medicalConditions: dossier.medicalConditions,
            currentMedications: dossier.currentMedications,
            allergies: [
              dossier.allergies,
              dossier.foodEnvironmentalAllergies,
            ]
              .filter(Boolean)
              .join("\n"),
            medicationAllergies: dossier.medicationAllergies,
            pharmacy:
              dossier.healthcareTeam.find((contact) => contact.role === "other")
                ?.organization ?? "",
            physician:
              dossier.healthcareTeam.find(
                (contact) => contact.role === "primary_physician",
              )?.name ?? "",
            physicianPhone:
              dossier.healthcareTeam.find(
                (contact) => contact.role === "primary_physician",
              )?.phone ?? "",
          },
          emergencyContact: dossier.emergencyContact
            ? {
                name: dossier.emergencyContact.name,
                email: dossier.emergencyContact.email,
                phone:
                  dossier.emergencyContact.cellPhone ||
                  dossier.emergencyContact.phone ||
                  dossier.emergencyContact.homePhone ||
                  "",
                relationship: dossier.emergencyContact.relationship,
              }
            : null,
          secondaryContact: dossier.secondaryContact
            ? {
                name: dossier.secondaryContact.name,
                email: dossier.secondaryContact.email,
                phone:
                  dossier.secondaryContact.cellPhone ||
                  dossier.secondaryContact.phone ||
                  dossier.secondaryContact.homePhone ||
                  "",
                relationship: dossier.secondaryContact.relationship,
              }
            : null,
          communicationPreference: "",
          decisionAuthority: dossier.signatureRelationship
            ? `${dossier.signatureRelationship} · dossier signé`
            : "",
        }
      : null,
    desiredMoveIn: app.desiredMoveIn ?? null,
    dossier: extras.dossier ?? null,
  };
}

const DECISION_BY_STATUS: Partial<Record<AdmissionStatus, string>> = {
  approved: "accepted",
  declined: "rejected",
  more_info: "info_requested",
  waitlisted: "waitlist",
  tour_requested: "tour_offered",
  assessment_requested: "assessment_offered",
};

export function decisionKindForStatus(status: AdmissionStatus): string | null {
  return DECISION_BY_STATUS[status] ?? null;
}
