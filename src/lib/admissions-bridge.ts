/**
 * Shared admissions bridge, connects family submissions to community intake
 * and community decisions back to the family application record (localStorage demo).
 */

import type { ApplicationStatus } from "@/data/applications";
import type { CommunityApplication } from "@/lib/community-portal";
import {
  canonicalSeniorName,
  scrubDemoNamesDeep,
} from "@/lib/demo-name-fix";
import type { CommunityDecisionKind, FamilyApplication } from "@/lib/family-applications";
import { applyCommunityDecision, withdrawApplication } from "@/lib/family-applications";

const SHARED_KEY = "haven-shared-admissions-v2";

export type SharedAdmissionPacket = {
  id: string;
  familyApplicationId: string;
  familyEmail: string;
  residenceId: string;
  residenceName: string;
  seniorName: string;
  seniorAge: number;
  /** Optional profile portrait shared with the receiving community */
  seniorPhotoUrl: string | null;
  relationship: string;
  summary: string;
  careNeeds: string[];
  medicalHighlights: string[];
  documents: { id: string; name: string; category: string; shared: boolean }[];
  family: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  };
  status: ApplicationStatus;
  submittedAt: string;
  lastUpdated: string;
  /** Community-side fields mirrored for family sync */
  infoRequest: string | null;
  documentRequest: string | null;
  tourProposal: string | null;
  assessmentProposal: string | null;
  waitlistPosition: number | null;
  withdrawn: boolean;
  decisionKind: CommunityDecisionKind | null;
  decisionNote: string | null;
};

function readAll(): SharedAdmissionPacket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SharedAdmissionPacket[];
    return list.map((p) =>
      scrubDemoNamesDeep({
        ...p,
        seniorName: canonicalSeniorName(p.seniorName),
      }),
    );
  } catch {
    return [];
  }
}

function writeAll(list: SharedAdmissionPacket[]) {
  localStorage.setItem(SHARED_KEY, JSON.stringify(list));
}

function upsert(packet: SharedAdmissionPacket) {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === packet.id || p.familyApplicationId === packet.familyApplicationId);
  if (idx >= 0) all[idx] = packet;
  else all.unshift(packet);
  writeAll(all);
  return packet;
}

export function publishFamilyApplication(
  app: FamilyApplication,
  extras?: {
    seniorName?: string;
    seniorAge?: number;
    relationship?: string;
    careNeeds?: string[];
    medicalHighlights?: string[];
    phone?: string;
    seniorPhotoUrl?: string | null;
    documentMeta?: { id: string; name: string; category: string }[];
  },
): SharedAdmissionPacket {
  const docs = (extras?.documentMeta || []).map((d) => ({
    ...d,
    shared: app.attachedDocumentIds.includes(d.id) || app.consentShare,
  }));

  const packet: SharedAdmissionPacket = {
    id: `shared-${app.id}`,
    familyApplicationId: app.id,
    familyEmail: (app.submittedByEmail || "").toLowerCase(),
    residenceId: app.residenceId,
    residenceName: app.residenceName,
    seniorName: canonicalSeniorName(extras?.seniorName, "Paul Gilbert"),
    seniorAge: extras?.seniorAge || 0,
    seniorPhotoUrl: extras?.seniorPhotoUrl?.trim() || null,
    relationship: extras?.relationship || "Family",
    summary:
      app.desiredMoveIn
        ? `Desired move-in: ${app.desiredMoveIn}. Submitted via Haven.`
        : "Application submitted via Haven.",
    careNeeds: extras?.careNeeds?.length ? extras.careNeeds : ["See care needs profile"],
    medicalHighlights: extras?.medicalHighlights?.length
      ? extras.medicalHighlights
      : ["See shared clinical documents"],
    documents: docs.length
      ? docs
      : [
          {
            id: "doc-consent",
            name: "Application consent packet",
            category: "Application",
            shared: true,
          },
        ],
    family: {
      name: app.submittedByName || "Family contact",
      email: app.submittedByEmail || "",
      phone: extras?.phone || ",",
      relationship: extras?.relationship || "Primary contact",
    },
    status: app.status,
    submittedAt: app.submittedAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    infoRequest: null,
    documentRequest: null,
    tourProposal: null,
    assessmentProposal: null,
    waitlistPosition: app.waitingPosition,
    withdrawn: false,
    decisionKind: null,
    decisionNote: null,
  };

  const saved = upsert(packet);
  notifyCommunityPortalOfApplication(saved);
  return saved;
}

const COMMUNITY_PORTAL_KEY = "haven-community-portal-v6";
export const COMMUNITY_ADMISSIONS_EVENT = "haven-community-admissions";

type PortalNotification = {
  id: string;
  type: "application_received";
  title: string;
  body: string;
  applicationId: string;
  at: string;
  read: boolean;
};

function applicationReceivedNote(packet: SharedAdmissionPacket): PortalNotification {
  return {
    id: `cnote-${packet.familyApplicationId}`,
    type: "application_received",
    title: "New application submitted",
    body: `${packet.seniorName} applied via Haven. Review the dossier in Admissions.`,
    applicationId: `capp-shared-${packet.familyApplicationId}`,
    at: packet.submittedAt || new Date().toISOString(),
    read: false,
  };
}

/** Push an unread alert into an existing community workspace when a family submits. */
export function notifyCommunityPortalOfApplication(packet: SharedAdmissionPacket) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COMMUNITY_PORTAL_KEY);
    if (!raw) {
      window.dispatchEvent(
        new CustomEvent(COMMUNITY_ADMISSIONS_EVENT, {
          detail: { residenceId: packet.residenceId },
        }),
      );
      return;
    }
    const map = JSON.parse(raw) as Record<
      string,
      { residenceId: string; applications?: unknown[]; notifications?: PortalNotification[]; updatedAt?: string }
    >;
    const ws = map[packet.residenceId];
    // Only patch a fully seeded workspace (must already have applications array)
    if (!ws || !Array.isArray(ws.applications)) {
      window.dispatchEvent(
        new CustomEvent(COMMUNITY_ADMISSIONS_EVENT, {
          detail: { residenceId: packet.residenceId },
        }),
      );
      return;
    }
    const note = applicationReceivedNote(packet);
    const existing = ws.notifications ?? [];
    if (!existing.some((n) => n.id === note.id)) {
      ws.notifications = [note, ...existing];
      ws.updatedAt = new Date().toISOString();
      map[packet.residenceId] = ws;
      localStorage.setItem(COMMUNITY_PORTAL_KEY, JSON.stringify(map));
    }
    window.dispatchEvent(
      new CustomEvent(COMMUNITY_ADMISSIONS_EVENT, {
        detail: { residenceId: packet.residenceId },
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Ensure shared submissions have matching unread notifications (e.g. first portal open). */
export function ensureApplicationNotifications(
  residenceId: string,
  notifications: PortalNotification[] = [],
): PortalNotification[] {
  const shared = listSharedForResidence(residenceId);
  const next = [...notifications];
  for (const packet of shared) {
    const note = applicationReceivedNote(packet);
    if (!next.some((n) => n.id === note.id)) {
      next.unshift(note);
    }
  }
  return next;
}

export function listSharedForResidence(residenceId: string): SharedAdmissionPacket[] {
  return readAll().filter((p) => p.residenceId === residenceId && !p.withdrawn);
}

export function getSharedByFamilyAppId(familyApplicationId: string): SharedAdmissionPacket | null {
  return readAll().find((p) => p.familyApplicationId === familyApplicationId) ?? null;
}

export function markSharedWithdrawn(familyApplicationId: string) {
  const all = readAll();
  const next = all.map((p) =>
    p.familyApplicationId === familyApplicationId
      ? {
          ...p,
          withdrawn: true,
          status: "withdrawn" as ApplicationStatus,
          lastUpdated: new Date().toISOString(),
        }
      : p,
  );
  writeAll(next);
}

export function updateSharedFromCommunity(
  sharedId: string,
  patch: Partial<SharedAdmissionPacket>,
): SharedAdmissionPacket | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === sharedId || p.familyApplicationId === sharedId);
  if (idx < 0) return null;
  const next = {
    ...all[idx],
    ...patch,
    lastUpdated: new Date().toISOString(),
  };
  all[idx] = next;
  writeAll(all);
  // Also push decision into family localStorage if present
  syncDecisionToFamilyStore(next);
  return next;
}

function familyStorageKey(email: string) {
  return `haven-family-v4-${email.toLowerCase()}`;
}

function syncDecisionToFamilyStore(packet: SharedAdmissionPacket) {
  if (!packet.familyEmail || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(familyStorageKey(packet.familyEmail));
    if (!raw) return;
    const data = JSON.parse(raw) as { applications?: FamilyApplication[] };
    if (!Array.isArray(data.applications)) return;

    const apps = data.applications.map((a) => {
      if (a.id !== packet.familyApplicationId) return a;
      if (packet.withdrawn) return withdrawApplication(a);

      let next = a;
      if (packet.decisionKind) {
        next = applyCommunityDecision(
          next,
          packet.decisionKind,
          packet.decisionNote || packet.documentRequest || packet.infoRequest || "",
        );
      }
      if (packet.documentRequest) {
        next = {
          ...next,
          requestedDocuments: packet.documentRequest.split("·").map((s) => s.trim()).filter(Boolean),
          status: "more_info",
        };
      }
      if (packet.tourProposal) {
        next = {
          ...next,
          upcomingAppointment: packet.tourProposal,
          status: packet.status || "tour_requested",
        };
      }
      if (packet.assessmentProposal) {
        next = {
          ...next,
          upcomingAppointment: packet.assessmentProposal,
          status: packet.status || "assessment_requested",
        };
      }
      if (packet.waitlistPosition != null) {
        next = { ...next, waitingPosition: packet.waitlistPosition, status: "waitlisted" };
      }
      if (packet.status) {
        next = { ...next, status: packet.status };
      }
      return next;
    });

    localStorage.setItem(
      familyStorageKey(packet.familyEmail),
      JSON.stringify({ ...data, applications: apps }),
    );
  } catch {
    /* ignore */
  }
}

/** Merge shared live applications into community workspace list (dedupe by familyApplicationId). */
export function mergeSharedIntoCommunityApps(
  residenceId: string,
  existing: CommunityApplication[],
): CommunityApplication[] {
  const shared = listSharedForResidence(residenceId);

  const mapped: CommunityApplication[] = shared.map((p) => {
    const id = `capp-shared-${p.familyApplicationId}`;
    const prior = existing.find(
      (e) =>
        e.id === id ||
        e.id === p.familyApplicationId ||
        (e.family.email.toLowerCase() === p.family.email.toLowerCase() &&
          e.seniorName === p.seniorName),
    );
    return {
      id,
      residenceId: p.residenceId,
      seniorName: canonicalSeniorName(p.seniorName),
      seniorAge: p.seniorAge || 80,
      seniorPhotoUrl: p.seniorPhotoUrl || prior?.seniorPhotoUrl || null,
      relationship: p.relationship,
      summary: scrubDemoNamesDeep(p.summary),
      careNeeds: p.careNeeds,
      medicalHighlights: p.medicalHighlights,
      documents: p.documents,
      family: p.family,
      status: p.status,
      careType: prior?.careType,
      referralSource: prior?.referralSource ?? "Family",
      priority: prior?.priority ?? "medium",
      executiveSummary: scrubDemoNamesDeep(prior?.executiveSummary ?? p.summary),
      insights: prior?.insights,
      dossier: prior?.dossier,
      emergencyContact: prior?.emergencyContact,
      paymentMethod: prior?.paymentMethod,
      moveInRequested: prior?.moveInRequested,
      focusReason: prior?.focusReason,
      nextAction: prior?.nextAction,
      assigneeId: prior?.assigneeId ?? null,
      assigneeName: prior?.assigneeName ?? null,
      internalNotes: prior?.internalNotes ?? [],
      infoRequest: p.infoRequest,
      documentRequest: p.documentRequest,
      tourProposal: p.tourProposal,
      assessmentProposal: p.assessmentProposal,
      waitlistPosition: p.waitlistPosition,
      submittedAt: p.submittedAt,
      lastUpdated: p.lastUpdated,
      auditLog:
        prior?.auditLog?.length
          ? prior.auditLog
          : [
              {
                id: `aud-bridge-${p.familyApplicationId}`,
                at: p.submittedAt,
                actor: "Haven",
                action: "Application received from family via Haven",
              },
            ],
    };
  });

  const liveKeys = new Set(
    shared.flatMap((s) => [
      `capp-shared-${s.familyApplicationId}`,
      s.familyApplicationId,
      `${s.family.email.toLowerCase()}::${s.seniorName}`,
    ]),
  );

  const seedOnly = existing.filter((e) => {
    if (e.id.startsWith("capp-shared-")) return false;
    if (liveKeys.has(e.id)) return false;
    if (liveKeys.has(`${e.family.email.toLowerCase()}::${e.seniorName}`)) return false;
    return true;
  });

  return [...mapped, ...seedOnly];
}

export function sharedIdFromCommunityAppId(communityAppId: string): string | null {
  if (communityAppId.startsWith("capp-shared-")) {
    return `shared-${communityAppId.replace("capp-shared-", "")}`;
  }
  return null;
}

export function decisionKindFromStatus(
  status: ApplicationStatus,
): CommunityDecisionKind | null {
  switch (status) {
    case "approved":
    case "conditionally_approved":
    case "offer_received":
      return "accepted";
    case "declined":
      return "rejected";
    case "more_info":
      return "info_requested";
    case "waitlisted":
      return "waitlist";
    case "tour_requested":
      return "tour_offered";
    case "assessment_requested":
      return "assessment_offered";
    default:
      return null;
  }
}
