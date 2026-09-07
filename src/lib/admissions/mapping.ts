/**
 * Server record <-> UI shapes.
 *
 * The community mapping reproduces, field for field, what the deleted
 * `mergeSharedIntoCommunityApps` produced, so the console renders exactly the
 * same markup from server data.
 */

import type { ApplicationStatus } from "@/data/applications";
import type { CommunityApplication } from "@/lib/community-portal";
import type { FamilyApplication } from "@/lib/family-applications";
import { canonicalSeniorName, scrubDemoNamesDeep } from "@/lib/demo-name-fix";
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
    family: record.familyContact,
    status: record.status as ApplicationStatus,
    careType: prior?.careType,
    referralSource: prior?.referralSource ?? "Family",
    priority: prior?.priority ?? "medium",
    executiveSummary: scrubDemoNamesDeep(prior?.executiveSummary ?? record.summary),
    insights: prior?.insights,
    dossier: prior?.dossier,
    emergencyContact: prior?.emergencyContact,
    paymentMethod: prior?.paymentMethod,
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
  } = {},
): AdmissionSubmitInput {
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
    desiredMoveIn: app.desiredMoveIn ?? null,
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
