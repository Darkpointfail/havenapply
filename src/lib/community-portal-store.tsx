"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { isFacilityRole } from "@/lib/auth-store";
import type { ApplicationStatus } from "@/data/applications";
import { fetchServerIdentity } from "@/lib/family/client-api";
import {
  admissionsEnabled,
  apiChangeAdmissionStatus,
  apiListResidenceAdmissions,
} from "@/lib/admissions/client-api";
import {
  admissionRecordToCommunityApplication,
  applicationIdFromCommunityAppId,
} from "@/lib/admissions/mapping";
import { isAdmissionStatus } from "@/lib/admissions/types";
import {
  COMMUNITY_PORTAL_STORAGE_KEY as STORAGE_KEY,
  communityRoleHas,
  computeDashboardStats,
  notifyCommunityProfileChanged,
  seedCommunityWorkspace,
  type AvailabilityUnit,
  type CommunityPermission,
  type CommunityPortalNotification,
  type CommunityProfile,
  type CommunityTeamMember,
  type CommunityTeamRole,
  type CommunityWorkspace,
  type DashboardStats,
} from "@/lib/community-portal";
import {
  deriveTransitionChecklist,
  ensureTransitionWork,
  type TransitionTimelineEntry,
  type TransitionWork,
} from "@/lib/community-transition";
import {
  buildTransferFromApplication,
  emptyPatientTransfer,
  transferPacketReady,
  type PatientTransfer,
} from "@/lib/patient-transfer";
import { canonicalSeniorName, scrubDemoNamesDeep } from "@/lib/demo-name-fix";
import { useT } from "@/lib/i18n/locale";

type PortalContextValue = {
  ready: boolean;
  workspace: CommunityWorkspace | null;
  myRole: CommunityTeamRole;
  can: (permission: CommunityPermission) => boolean;
  stats: DashboardStats | null;
  unreadNotifications: CommunityPortalNotification[];
  getApplication: (id: string) => CommunityWorkspace["applications"][0] | undefined;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  assignApplication: (appId: string, memberId: string | null) => { ok: boolean; error?: string };
  addInternalNote: (appId: string, body: string) => { ok: boolean; error?: string };
  requestInfo: (appId: string, text: string) => { ok: boolean; error?: string };
  requestDocument: (appId: string, text: string) => { ok: boolean; error?: string };
  proposeTour: (appId: string, when: string) => { ok: boolean; error?: string };
  proposeAssessment: (appId: string, when: string) => { ok: boolean; error?: string };
  changeStatus: (appId: string, status: ApplicationStatus) => { ok: boolean; error?: string };
  acceptApplication: (
    appId: string,
    options?: {
      note?: string;
      email?: { to: string; subject: string; body: string } | null;
      sms?: { to: string; body: string } | null;
    },
  ) => { ok: boolean; error?: string };
  declineApplication: (appId: string, note?: string) => { ok: boolean; error?: string };
  updateReviewChecklist: (
    appId: string,
    patch: Partial<Record<string, boolean>>,
  ) => { ok: boolean; error?: string };
  updateTransitionChecklist: (
    appId: string,
    patch: Partial<Record<string, boolean>>,
  ) => { ok: boolean; error?: string };
  setMoveInConfirmed: (
    appId: string,
    date: string | null,
  ) => { ok: boolean; error?: string };
  completeTransition: (appId: string, note?: string) => { ok: boolean; error?: string };
  saveTransitionWork: (
    appId: string,
    updater: (prev: TransitionWork) => TransitionWork,
    timelineAction?: string,
    timelineDetail?: string,
    stepId?: import("@/lib/community-transition").TransitionStepId,
  ) => { ok: boolean; error?: string };
  createPatientTransfer: (input?: {
    applicationId?: string | null;
  }) => { ok: boolean; error?: string; transfer?: PatientTransfer };
  updatePatientTransfer: (
    transferId: string,
    updater: (prev: PatientTransfer) => PatientTransfer,
    timelineAction?: string,
    timelineDetail?: string,
  ) => { ok: boolean; error?: string };
  sendPatientTransfer: (transferId: string) => { ok: boolean; error?: string };
  getPatientTransfer: (id: string) => PatientTransfer | undefined;
  updateProfile: (patch: Partial<CommunityProfile>) => { ok: boolean; error?: string };
  upsertAvailability: (unit: AvailabilityUnit) => { ok: boolean; error?: string };
  removeAvailability: (unitId: string) => { ok: boolean; error?: string };
  updateTeamMemberRole: (
    memberId: string,
    role: CommunityTeamRole,
  ) => { ok: boolean; error?: string };
  inviteTeamMember: (input: {
    name: string;
    email: string;
    role: CommunityTeamRole;
    jobTitle: string;
  }) => { ok: boolean; error?: string };
};

function normalizeWorkspace(ws: CommunityWorkspace): CommunityWorkspace {
  const notifications = Array.isArray(ws.notifications) ? ws.notifications : [];
  return {
    ...ws,
    profile: {
      ...ws.profile,
      acceptingApplications: ws.profile?.acceptingApplications !== false,
    },
    notifications,
    patientTransfers: Array.isArray(ws.patientTransfers) ? ws.patientTransfers : [],
  };
}

const PortalContext = createContext<PortalContextValue | null>(null);

/**
 * Applications targeting this staff member's sites, as decided by the server.
 * `prior` only carries staff-side annotations (notes, assignee, checklists);
 * it can never introduce an application the server did not return.
 */
async function fetchServerApplications(
  prior: CommunityWorkspace["applications"],
): Promise<CommunityWorkspace["applications"]> {
  const res = await apiListResidenceAdmissions();
  const records = res?.ok && Array.isArray(res.applications) ? res.applications : [];
  const priorById = new Map(prior.map((app) => [app.id, app]));

  return records.map((record) => {
    const mapped = admissionRecordToCommunityApplication(
      record,
      priorById.get(`capp-shared-${record.id}`),
    );
    return scrubDemoNamesDeep({
      ...mapped,
      seniorName: canonicalSeniorName(mapped.seniorName),
      careNeeds: Array.isArray(mapped.careNeeds) ? mapped.careNeeds : [],
      medicalHighlights: Array.isArray(mapped.medicalHighlights) ? mapped.medicalHighlights : [],
      documents: Array.isArray(mapped.documents) ? mapped.documents : [],
      auditLog: Array.isArray(mapped.auditLog) ? mapped.auditLog : [],
      internalNotes: Array.isArray(mapped.internalNotes) ? mapped.internalNotes : [],
      family: mapped.family || {
        name: "Family contact",
        email: "family@example.com",
        phone: "",
        relationship: "Family",
      },
    });
  });
}

function readMap(): Record<string, CommunityWorkspace> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CommunityWorkspace>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, CommunityWorkspace>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function CommunityPortalProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [workspace, setWorkspace] = useState<CommunityWorkspace | null>(null);
  const [ready, setReady] = useState(false);
  const [serverScope, setServerScope] = useState<{
    siteIds: string[];
    siteRoles: { siteId: string; role: string }[];
  } | null>(null);
  const workspaceRef = useRef<CommunityWorkspace | null>(null);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    if (!authReady) return;
    if (!user || !isFacilityRole(user.role)) {
      setWorkspace(null);
      setReady(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // Scope comes from the server: which sites this account is a member of.
      const identity = await fetchServerIdentity();
      if (cancelled) return;
      const siteIds = identity?.siteIds ?? [];
      const siteRoles = identity?.siteRoles ?? [];
      setServerScope({ siteIds, siteRoles });

      const residenceId = siteIds[0];
      if (!residenceId) {
        // No membership, no workspace. Nothing is inferred from the address.
        setWorkspace(null);
        setReady(true);
        return;
      }

      // Workspace shell (profile, team, availability) stays local for now; the
      // applications list comes from the server and never from a demo seed.
      const map = readMap();
      const shell = map[residenceId] ?? seedCommunityWorkspace(residenceId);
      const prior = Array.isArray(shell.applications) ? shell.applications : [];

      const applications = admissionsEnabled()
        ? await fetchServerApplications(prior)
        : prior;
      if (cancelled) return;

      const ws = normalizeWorkspace({
        ...shell,
        applications,
        updatedAt: new Date().toISOString(),
      });
      const nextMap = readMap();
      nextMap[residenceId] = ws;
      writeMap(nextMap);
      setWorkspace(ws);
      setReady(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  const persist = useCallback(
    (updater: (prev: CommunityWorkspace) => CommunityWorkspace) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        const map = readMap();
        map[next.residenceId] = next;
        writeMap(map);
        return next;
      });
    },
    [],
  );

  // Refetch from the server when staff come back to the tab: a submission made
  // on another machine has no way to notify this one.
  useEffect(() => {
    if (!authReady || !user || !isFacilityRole(user.role)) return;
    if (!admissionsEnabled()) return;
    const refresh = () => {
      void (async () => {
        const current = workspaceRef.current;
        const applications = await fetchServerApplications(current?.applications ?? []);
        persist((ws) =>
          normalizeWorkspace({
            ...ws,
            applications,
            updatedAt: new Date().toISOString(),
          }),
        );
      })();
    };
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [authReady, user, persist]);

  const myRole: CommunityTeamRole = useMemo(() => {
    if (!user || !workspace || !serverScope) return "readonly";
    // The membership row is the only source of a staff role. No fallback to
    // admin, no lookup by email: the server already answered.
    const granted = serverScope.siteRoles.find((r) => r.siteId === workspace.residenceId);
    const role = granted?.role;
    return role === "admin" || role === "manager" || role === "coordinator" || role === "readonly"
      ? (role as CommunityTeamRole)
      : "readonly";
  }, [user, workspace, serverScope]);

  const can = useCallback(
    (permission: CommunityPermission) => communityRoleHas(myRole, permission),
    [myRole],
  );

  const stats = useMemo(
    () => (workspace ? computeDashboardStats(workspace) : null),
    [workspace],
  );

  const actorName = user?.name || "Team member";

  const pushAudit = useCallback(
    (ws: CommunityWorkspace, action: string) => ({
      ...ws,
      auditLog: [
        ...ws.auditLog,
        {
          id: `aud-${Date.now()}`,
          at: new Date().toISOString(),
          actor: actorName,
          action,
        },
      ],
      updatedAt: new Date().toISOString(),
    }),
    [actorName],
  );

  const getApplication = useCallback(
    (id: string) => workspace?.applications.find((a) => a.id === id),
    [workspace],
  );

  const unreadNotifications = useMemo(
    () => (workspace?.notifications ?? []).filter((n) => !n.read),
    [workspace],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      persist((ws) => ({
        ...ws,
        notifications: (ws.notifications ?? []).map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  const markAllNotificationsRead = useCallback(() => {
    persist((ws) => ({
      ...ws,
      notifications: (ws.notifications ?? []).map((n) => ({ ...n, read: true })),
      updatedAt: new Date().toISOString(),
    }));
  }, [persist]);

  const mutateApp = useCallback(
    (
      appId: string,
      permission: CommunityPermission,
      fn: (
        app: CommunityWorkspace["applications"][0],
      ) => CommunityWorkspace["applications"][0],
      auditAction: string,
    ) => {
      if (!can(permission)) return { ok: false, error: "You don’t have permission for this action." };
      if (!workspace?.applications.some((a) => a.id === appId)) {
        return { ok: false, error: "Application not found." };
      }
      persist((ws) => {
        const apps = ws.applications.map((a) => {
          if (a.id !== appId) return a;
          const next = fn(a);
          const enriched = {
            ...next,
            lastUpdated: new Date().toISOString(),
            auditLog: [
              ...next.auditLog,
              {
                id: `aa-${Date.now()}`,
                at: new Date().toISOString(),
                actor: actorName,
                action: auditAction,
              },
            ],
          };
          // Persist the transition server-side: the family reads its status
          // from the same source of truth, from any device.
          const serverId = applicationIdFromCommunityAppId(appId);
          if (serverId && admissionsEnabled() && isAdmissionStatus(enriched.status)) {
            void apiChangeAdmissionStatus(serverId, enriched.status, {
              note: auditAction,
              waitlistPosition: enriched.waitlistPosition,
            });
          }
          return enriched;
        });
        return pushAudit({ ...ws, applications: apps }, auditAction);
      });
      return { ok: true };
    },
    [actorName, can, persist, pushAudit, workspace],
  );

  const assignApplication = useCallback(
    (appId: string, memberId: string | null) => {
      if (!workspace) return { ok: false, error: "Workspace not ready." };
      const member = memberId
        ? workspace.team.find((t) => t.id === memberId)
        : null;
      return mutateApp(
        appId,
        "assignApplications",
        (a) => ({
          ...a,
          assigneeId: member?.id ?? null,
          assigneeName: member?.name ?? null,
        }),
        member ? `Assigned to ${member.name}` : "Cleared assignment",
      );
    },
    [mutateApp, workspace],
  );

  const addInternalNote = useCallback(
    (appId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return { ok: false, error: "Write a note first." };
      return mutateApp(
        appId,
        "addInternalNotes",
        (a) => ({
          ...a,
          internalNotes: [
            {
              id: `n-${Date.now()}`,
              author: actorName,
              body: trimmed,
              at: new Date().toISOString(),
            },
            ...a.internalNotes,
          ],
        }),
        "Added internal note",
      );
    },
    [actorName, mutateApp],
  );

  const requestInfo = useCallback(
    (appId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "Describe the information needed." };
      return mutateApp(
        appId,
        "requestInfo",
        (a) => ({
          ...a,
          infoRequest: trimmed,
          status: "more_info" as ApplicationStatus,
        }),
        `Requested information: ${trimmed}`,
      );
    },
    [mutateApp],
  );

  const requestDocument = useCallback(
    (appId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "Name the document(s) needed." };
      return mutateApp(
        appId,
        "requestDocuments",
        (a) => ({
          ...a,
          documentRequest: trimmed,
          status: "more_info" as ApplicationStatus,
        }),
        `Requested document(s): ${trimmed}`,
      );
    },
    [mutateApp],
  );

  const proposeTour = useCallback(
    (appId: string, when: string) => {
      const trimmed = when.trim();
      if (!trimmed) return { ok: false, error: "Enter a visit date/time." };
      return mutateApp(
        appId,
        "proposeTour",
        (a) => ({
          ...a,
          tourProposal: trimmed,
          status: "tour_requested" as ApplicationStatus,
        }),
        `Proposed visit: ${trimmed}`,
      );
    },
    [mutateApp],
  );

  const proposeAssessment = useCallback(
    (appId: string, when: string) => {
      const trimmed = when.trim();
      if (!trimmed) return { ok: false, error: "Enter an assessment slot." };
      return mutateApp(
        appId,
        "proposeAssessment",
        (a) => ({
          ...a,
          assessmentProposal: trimmed,
          status: "assessment_requested" as ApplicationStatus,
        }),
        `Proposed assessment: ${trimmed}`,
      );
    },
    [mutateApp],
  );

  const changeStatus = useCallback(
    (appId: string, status: ApplicationStatus) =>
      mutateApp(appId, "changeStatus", (a) => ({ ...a, status }), `Status → ${status}`),
    [mutateApp],
  );

  const acceptApplication = useCallback(
    (
      appId: string,
      options?: {
        note?: string;
        email?: { to: string; subject: string; body: string } | null;
        sms?: { to: string; body: string } | null;
      },
    ) => {
      const note = options?.note?.trim();
      const email = options?.email;
      const sms = options?.sms;
      const channels: string[] = [];
      if (email?.to.trim() && email.body.trim()) {
        channels.push(`email to ${email.to.trim()}`);
      }
      if (sms?.to.trim() && sms.body.trim()) {
        channels.push(`SMS to ${sms.to.trim()}`);
      }

      return mutateApp(
        appId,
        "acceptDecline",
        (a) => {
          const now = new Date().toISOString();
          const notifyAudits: typeof a.auditLog = [];
          if (email?.to.trim() && email.body.trim()) {
            notifyAudits.push({
              id: `aud-email-${Date.now()}`,
              at: now,
              actor: actorName,
              action: `Acceptance email sent to ${email.to.trim()} · ${email.subject.trim() || "No subject"}`,
            });
            notifyAudits.push({
              id: `aud-email-body-${Date.now()}`,
              at: now,
              actor: actorName,
              action: `Email message: ${email.body.trim().slice(0, 280)}${email.body.trim().length > 280 ? "…" : ""}`,
            });
          }
          if (sms?.to.trim() && sms.body.trim()) {
            notifyAudits.push({
              id: `aud-sms-${Date.now()}`,
              at: now,
              actor: actorName,
              action: `Acceptance SMS sent to ${sms.to.trim()}: ${sms.body.trim().slice(0, 160)}${sms.body.trim().length > 160 ? "…" : ""}`,
            });
          }
          return {
            ...a,
            status: "approved" as ApplicationStatus,
            transitionChecklist: a.transitionChecklist ?? {},
            moveInConfirmed: a.moveInConfirmed ?? null,
            auditLog: [...a.auditLog, ...notifyAudits],
          };
        },
        [
          "Accepted · moved to transition",
          channels.length ? `notified via ${channels.join(" · ")}` : null,
          note || null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
    },
    [actorName, mutateApp],
  );

  const declineApplication = useCallback(
    (appId: string, note?: string) =>
      mutateApp(
        appId,
        "acceptDecline",
        (a) => ({ ...a, status: "declined" as ApplicationStatus }),
        note?.trim() ? `Declined · ${note.trim()}` : "Declined application",
      ),
    [mutateApp],
  );

  const updateReviewChecklist = useCallback(
    (appId: string, patch: Partial<Record<string, boolean>>) => {
      if (!workspace?.applications.some((a) => a.id === appId)) {
        return { ok: false, error: "Application not found." };
      }
      persist((ws) => ({
        ...ws,
        applications: ws.applications.map((a) => {
          if (a.id !== appId) return a;
          const prev = a.reviewChecklist || {};
          const nextChecks = { ...prev, ...patch };
          const wasEmpty = !Object.values(prev).some(Boolean);
          const nowStarted = Object.values(nextChecks).some(Boolean);
          const bumpStatus =
            nowStarted && ["submitted", "received"].includes(a.status)
              ? ("under_review" as ApplicationStatus)
              : a.status;
          return {
            ...a,
            reviewChecklist: nextChecks,
            status: bumpStatus,
            lastUpdated: new Date().toISOString(),
            auditLog:
              wasEmpty && nowStarted
                ? [
                    ...a.auditLog,
                    {
                      id: `aud-${Date.now()}`,
                      at: new Date().toISOString(),
                      actor: actorName,
                      action: "Started guided admission review",
                    },
                  ]
                : a.auditLog,
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
      return { ok: true };
    },
    [actorName, persist, workspace],
  );

  const updateTransitionChecklist = useCallback(
    (appId: string, patch: Partial<Record<string, boolean>>) => {
      if (!can("acceptDecline")) {
        return { ok: false, error: "You don’t have permission for this action." };
      }
      if (!workspace?.applications.some((a) => a.id === appId)) {
        return { ok: false, error: "Application not found." };
      }
      persist((ws) => ({
        ...ws,
        applications: ws.applications.map((a) => {
          if (a.id !== appId) return a;
          const prev = a.transitionChecklist || {};
          const nextChecks = { ...prev, ...patch };
          const moveInDone = Boolean(nextChecks.moveInDate);
          const nextStatus =
            moveInDone && a.status === "approved"
              ? ("move_in_scheduled" as ApplicationStatus)
              : a.status;
          const flipped = Object.entries(patch).find(
            ([key, value]) => Boolean(value) && !prev[key],
          );
          return {
            ...a,
            transitionChecklist: nextChecks,
            status: nextStatus,
            lastUpdated: new Date().toISOString(),
            auditLog: flipped
              ? [
                  ...a.auditLog,
                  {
                    id: `aud-${Date.now()}`,
                    at: new Date().toISOString(),
                    actor: actorName,
                    action: `Transition · ${flipped[0]} complete`,
                  },
                ]
              : a.auditLog,
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
      return { ok: true };
    },
    [actorName, can, persist, workspace],
  );

  const setMoveInConfirmed = useCallback(
    (appId: string, date: string | null) =>
      mutateApp(
        appId,
        "acceptDecline",
        (a) => ({
          ...a,
          moveInConfirmed: date,
          transitionChecklist: {
            ...(a.transitionChecklist || {}),
            ...(date ? { moveInDate: true } : {}),
          },
          status: date
            ? ("move_in_scheduled" as ApplicationStatus)
            : a.status === "move_in_scheduled"
              ? ("approved" as ApplicationStatus)
              : a.status,
        }),
        date ? `Transition · move-in confirmed ${date}` : "Transition · move-in date cleared",
      ),
    [mutateApp],
  );

  const saveTransitionWork = useCallback(
    (
      appId: string,
      updater: (prev: TransitionWork) => TransitionWork,
      timelineAction?: string,
      timelineDetail?: string,
      stepId?: import("@/lib/community-transition").TransitionStepId,
    ) => {
      if (!can("acceptDecline")) {
        return { ok: false, error: "You don’t have permission for this action." };
      }
      const app = workspace?.applications.find((a) => a.id === appId);
      if (!app) return { ok: false, error: "Application not found." };

      persist((ws) => ({
        ...ws,
        applications: ws.applications.map((a) => {
          if (a.id !== appId) return a;
          const prev = ensureTransitionWork(a, ws.profile);
          let next = updater(prev);
          if (timelineAction) {
            const entry: TransitionTimelineEntry = {
              id: `tl-${Date.now()}`,
              at: new Date().toISOString(),
              actor: actorName,
              action: timelineAction,
              detail: timelineDetail,
              stepId,
            };
            next = { ...next, timeline: [entry, ...next.timeline] };
          }
          const checks = deriveTransitionChecklist(next);
          const moveInDone = checks.moveInDate;
          return {
            ...a,
            transitionWork: next,
            transitionChecklist: checks,
            moveInConfirmed: next.moveIn.confirmedDate || a.moveInConfirmed || null,
            status:
              moveInDone && a.status === "approved"
                ? ("move_in_scheduled" as ApplicationStatus)
                : a.status,
            lastUpdated: new Date().toISOString(),
            auditLog: timelineAction
              ? [
                  ...a.auditLog,
                  {
                    id: `aud-${Date.now()}`,
                    at: new Date().toISOString(),
                    actor: actorName,
                    action: timelineAction,
                  },
                ]
              : a.auditLog,
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
      return { ok: true };
    },
    [actorName, can, persist, workspace],
  );

  const completeTransition = useCallback(
    (appId: string, note?: string) => {
      const app = workspace?.applications.find((a) => a.id === appId);
      if (!app) return { ok: false, error: "Application not found." };
      const work = ensureTransitionWork(app, workspace?.profile);
      const checks = deriveTransitionChecklist(work);
      const required = ["contract", "payment", "familyDetails", "moveInDate"] as const;
      const done = required.every((id) => Boolean(checks[id]));
      if (!done) {
        return {
          ok: false,
          error: "Finish every transition step before closing the dossier.",
        };
      }
      return mutateApp(
        appId,
        "acceptDecline",
        (a) => {
          const prev = ensureTransitionWork(a, workspace?.profile);
          const entry: TransitionTimelineEntry = {
            id: `tl-${Date.now()}`,
            at: new Date().toISOString(),
            actor: actorName,
            action: "Transition completed · dossier closed",
            detail: note?.trim() || undefined,
          };
          return {
            ...a,
            status: "closed" as ApplicationStatus,
            transitionChecklist: checks,
            transitionWork: {
              ...prev,
              timeline: [entry, ...prev.timeline],
            },
          };
        },
        note?.trim()
          ? `Transition complete · dossier closed · ${note.trim()}`
          : "Transition complete · dossier closed",
      );
    },
    [actorName, mutateApp, workspace],
  );

  const getPatientTransfer = useCallback(
    (id: string) => workspace?.patientTransfers?.find((t) => t.id === id),
    [workspace],
  );

  const createPatientTransfer = useCallback(
    (input?: { applicationId?: string | null }) => {
      if (!can("acceptDecline")) {
        return { ok: false, error: "You don’t have permission for this action." };
      }
      if (!workspace) return { ok: false, error: "Workspace unavailable." };

      const appId = input?.applicationId || null;
      const app = appId
        ? workspace.applications.find((a) => a.id === appId)
        : undefined;
      if (appId && !app) return { ok: false, error: "Resident dossier not found." };

      const transfer = app
        ? buildTransferFromApplication(app, actorName)
        : emptyPatientTransfer(actorName);

      persist((ws) =>
        pushAudit(
          {
            ...ws,
            patientTransfers: [transfer, ...(ws.patientTransfers || [])],
          },
          `Created patient transfer draft${transfer.residentName ? ` · ${transfer.residentName}` : ""}`,
        ),
      );
      return { ok: true, transfer };
    },
    [actorName, can, persist, pushAudit, workspace],
  );

  const updatePatientTransfer = useCallback(
    (
      transferId: string,
      updater: (prev: PatientTransfer) => PatientTransfer,
      timelineAction?: string,
      timelineDetail?: string,
    ) => {
      if (!can("acceptDecline")) {
        return { ok: false, error: "You don’t have permission for this action." };
      }
      if (!workspace?.patientTransfers?.some((t) => t.id === transferId)) {
        return { ok: false, error: "Transfer not found." };
      }
      const now = new Date().toISOString();
      persist((ws) => ({
        ...ws,
        patientTransfers: (ws.patientTransfers || []).map((t) => {
          if (t.id !== transferId) return t;
          let next = updater(t);
          next = { ...next, updatedAt: now };
          if (timelineAction) {
            next = {
              ...next,
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  at: now,
                  actor: actorName,
                  action: timelineAction,
                  detail: timelineDetail,
                },
                ...next.timeline,
              ],
            };
          }
          // Auto-promote draft → ready when packet is complete
          if (next.status === "draft" && transferPacketReady(next).ok) {
            next = { ...next, status: "ready" };
          }
          return next;
        }),
        updatedAt: now,
      }));
      return { ok: true };
    },
    [actorName, can, persist, workspace],
  );

  const sendPatientTransfer = useCallback(
    (transferId: string) => {
      if (!can("acceptDecline")) {
        return { ok: false, error: "You don’t have permission for this action." };
      }
      const existing = workspace?.patientTransfers?.find((t) => t.id === transferId);
      if (!existing) return { ok: false, error: "Transfer not found." };
      const ready = transferPacketReady(existing);
      if (!ready.ok) {
        return {
          ok: false,
          error: `Complete required fields before sending: ${ready.missing.join(", ")}.`,
        };
      }
      if (existing.status === "cancelled") {
        return { ok: false, error: "This transfer was cancelled." };
      }
      const now = new Date().toISOString();
      persist((ws) =>
        pushAudit(
          {
            ...ws,
            patientTransfers: (ws.patientTransfers || []).map((t) => {
              if (t.id !== transferId) return t;
              return {
                ...t,
                status: "sent" as const,
                sentAt: now,
                updatedAt: now,
                timeline: [
                  {
                    id: `tl-${Date.now()}`,
                    at: now,
                    actor: actorName,
                    action: "Transfer packet sent to receiving center",
                    detail: t.destination?.name,
                  },
                  ...t.timeline,
                ],
              };
            }),
          },
          `Sent patient transfer · ${existing.residentName} → ${existing.destination?.name || "center"}`,
        ),
      );
      return { ok: true };
    },
    [actorName, can, persist, pushAudit, workspace],
  );

  const updateProfile = useCallback(
    (patch: Partial<CommunityProfile>) => {
      const onlyAccepting =
        Object.keys(patch).length === 1 && typeof patch.acceptingApplications === "boolean";
      const canEditProfile =
        can("editProfile") || can("editPricing") || can("editAdmissions");
      const canToggleIntake = canEditProfile || can("acceptDecline");
      if (onlyAccepting ? !canToggleIntake : !canEditProfile) {
        return { ok: false, error: "You don’t have permission to edit the profile." };
      }
      let residenceId = "";
      let auditMsg = "Updated community profile";
      if (typeof patch.acceptingApplications === "boolean") {
        auditMsg = patch.acceptingApplications
          ? "Opened new applications"
          : "Closed new applications";
      }
      persist((ws) => {
        residenceId = ws.residenceId;
        return pushAudit(
          { ...ws, profile: { ...ws.profile, ...patch } },
          auditMsg,
        );
      });
      notifyCommunityProfileChanged(residenceId || undefined);
      return { ok: true };
    },
    [can, persist, pushAudit],
  );

  const upsertAvailability = useCallback(
    (unit: AvailabilityUnit) => {
      if (!can("editAvailability")) {
        return { ok: false, error: "You don’t have permission to edit availability." };
      }
      persist((ws) => {
        const exists = ws.availability.some((u) => u.id === unit.id);
        const availability = exists
          ? ws.availability.map((u) => (u.id === unit.id ? unit : u))
          : [unit, ...ws.availability];
        const openBeds = availability.reduce((s, u) => s + u.count, 0);
        const waitlistTotal = availability.reduce((s, u) => s + u.waitlistCount, 0);
        return pushAudit(
          {
            ...ws,
            availability,
            metrics: { ...ws.metrics, openBeds, waitlistTotal },
          },
          exists ? `Updated availability · ${unit.roomType}` : `Added availability · ${unit.roomType}`,
        );
      });
      return { ok: true };
    },
    [can, persist, pushAudit],
  );

  const removeAvailability = useCallback(
    (unitId: string) => {
      if (!can("editAvailability")) {
        return { ok: false, error: "You don’t have permission to edit availability." };
      }
      persist((ws) => {
        const unit = ws.availability.find((u) => u.id === unitId);
        const availability = ws.availability.filter((u) => u.id !== unitId);
        const openBeds = availability.reduce((s, u) => s + u.count, 0);
        const waitlistTotal = availability.reduce((s, u) => s + u.waitlistCount, 0);
        return pushAudit(
          {
            ...ws,
            availability,
            metrics: { ...ws.metrics, openBeds, waitlistTotal },
          },
          `Removed availability · ${unit?.roomType || unitId}`,
        );
      });
      return { ok: true };
    },
    [can, persist, pushAudit],
  );

  const updateTeamMemberRole = useCallback(
    (memberId: string, role: CommunityTeamRole) => {
      if (!can("manageTeam")) {
        return { ok: false, error: "You don’t have permission to manage the team." };
      }
      persist((ws) => {
        const member = ws.team.find((t) => t.id === memberId);
        return pushAudit(
          {
            ...ws,
            team: ws.team.map((t) => (t.id === memberId ? { ...t, role } : t)),
          },
          `Changed role for ${member?.name || memberId} → ${role}`,
        );
      });
      return { ok: true };
    },
    [can, persist, pushAudit],
  );

  const inviteTeamMember = useCallback(
    (input: {
      name: string;
      email: string;
      role: CommunityTeamRole;
      jobTitle: string;
    }) => {
      if (!can("manageTeam")) {
        return { ok: false, error: "You don’t have permission to manage the team." };
      }
      const email = input.email.trim().toLowerCase();
      if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
      const member: CommunityTeamMember = {
        id: `tm-${Date.now()}`,
        name: input.name.trim() || email.split("@")[0],
        email,
        role: input.role,
        status: "invited",
        jobTitle: input.jobTitle.trim() || "Team member",
      };
      persist((ws) =>
        pushAudit(
          { ...ws, team: [...ws.team, member] },
          `Invited ${member.name} (${member.email}) as ${member.role}`,
        ),
      );
      return { ok: true };
    },
    [can, persist, pushAudit],
  );

  const value = useMemo(
    () => ({
      ready,
      workspace,
      myRole,
      can,
      stats,
      unreadNotifications,
      getApplication,
      markNotificationRead,
      markAllNotificationsRead,
      assignApplication,
      addInternalNote,
      requestInfo,
      requestDocument,
      proposeTour,
      proposeAssessment,
      changeStatus,
      acceptApplication,
      declineApplication,
      updateReviewChecklist,
      updateTransitionChecklist,
      setMoveInConfirmed,
      completeTransition,
      saveTransitionWork,
      createPatientTransfer,
      updatePatientTransfer,
      sendPatientTransfer,
      getPatientTransfer,
      updateProfile,
      upsertAvailability,
      removeAvailability,
      updateTeamMemberRole,
      inviteTeamMember,
    }),
    [
      ready,
      workspace,
      myRole,
      can,
      stats,
      unreadNotifications,
      getApplication,
      markNotificationRead,
      markAllNotificationsRead,
      assignApplication,
      addInternalNote,
      requestInfo,
      requestDocument,
      proposeTour,
      proposeAssessment,
      changeStatus,
      acceptApplication,
      declineApplication,
      updateReviewChecklist,
      updateTransitionChecklist,
      setMoveInConfirmed,
      completeTransition,
      saveTransitionWork,
      createPatientTransfer,
      updatePatientTransfer,
      sendPatientTransfer,
      getPatientTransfer,
      updateProfile,
      upsertAvailability,
      removeAvailability,
      updateTeamMemberRole,
      inviteTeamMember,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function useCommunityPortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("useCommunityPortal must be used within CommunityPortalProvider");
  return ctx;
}
