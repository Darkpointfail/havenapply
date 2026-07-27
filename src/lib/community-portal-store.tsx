"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { isFacilityRole } from "@/lib/auth-store";
import type { ApplicationStatus } from "@/data/applications";
import {
  COMMUNITY_ADMISSIONS_EVENT,
  decisionKindFromStatus,
  ensureApplicationNotifications,
  mergeSharedIntoCommunityApps,
  sharedIdFromCommunityAppId,
  updateSharedFromCommunity,
} from "@/lib/admissions-bridge";
import {
  communityRoleHas,
  computeDashboardStats,
  ensureDemoApplications,
  resolveCommunityResidenceId,
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
import { canonicalSeniorName, scrubDemoNamesDeep } from "@/lib/demo-name-fix";
import { useT } from "@/lib/i18n/locale";

const STORAGE_KEY = "haven-community-portal-v10";

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
  acceptApplication: (appId: string, note?: string) => { ok: boolean; error?: string };
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
  const notifications = ensureApplicationNotifications(
    ws.residenceId,
    Array.isArray(ws.notifications) ? ws.notifications : [],
  );
  return { ...ws, notifications };
}

const PortalContext = createContext<PortalContextValue | null>(null);

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

  useEffect(() => {
    if (!authReady) return;
    if (!user || !isFacilityRole(user.role)) {
      setWorkspace(null);
      setReady(true);
      return;
    }

    const residenceId = resolveCommunityResidenceId(user.organization, user.email);
    const map = readMap();
    let ws = map[residenceId];
    if (!ws || !Array.isArray(ws.applications) || ws.applications.length === 0) {
      ws = seedCommunityWorkspace(residenceId);
    } else {
      // Older workspaces may be missing later demo dossiers (e.g. Helen Brooks).
      ws = ensureDemoApplications(ws);
    }
    // Merge live family submissions into intake list
    const mergedApps = mergeSharedIntoCommunityApps(residenceId, ws.applications).map((app) =>
      scrubDemoNamesDeep({
        ...app,
        seniorName: canonicalSeniorName(app.seniorName),
        careNeeds: Array.isArray(app.careNeeds) ? app.careNeeds : [],
        medicalHighlights: Array.isArray(app.medicalHighlights) ? app.medicalHighlights : [],
        documents: Array.isArray(app.documents) ? app.documents : [],
        auditLog: Array.isArray(app.auditLog) ? app.auditLog : [],
        internalNotes: Array.isArray(app.internalNotes) ? app.internalNotes : [],
        family: app.family || {
          name: "Family contact",
          email: "family@example.com",
          phone: "",
          relationship: "Family",
        },
      }),
    );
    ws = normalizeWorkspace({
      ...ws,
      applications: mergedApps,
      updatedAt: new Date().toISOString(),
    });
    map[residenceId] = ws;
    writeMap(map);
    setWorkspace(ws);
    setReady(true);
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

  // Refresh shared applications when community returns to the tab or a family submits
  useEffect(() => {
    if (!authReady || !user || !isFacilityRole(user.role)) return;
    const refresh = () => {
      persist((ws) =>
        normalizeWorkspace({
          ...ws,
          applications: mergeSharedIntoCommunityApps(ws.residenceId, ws.applications),
          updatedAt: new Date().toISOString(),
        }),
      );
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(COMMUNITY_ADMISSIONS_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(COMMUNITY_ADMISSIONS_EVENT, refresh);
    };
  }, [authReady, user, persist]);

  const myRole: CommunityTeamRole = useMemo(() => {
    if (!user || !workspace) return "readonly";
    const email = user.email.toLowerCase();
    const member = workspace.team.find((t) => t.email.toLowerCase() === email);
    if (member) return member.role;
    // Demo / open-access community owners default to admin
    if (
      email === "community@demo.haven" ||
      email === "demo.admissions@havenapply.local"
    ) {
      return "admin";
    }
    return "admissions_manager";
  }, [user, workspace]);

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
      bridgePatch?: (
        next: CommunityWorkspace["applications"][0],
      ) => Parameters<typeof updateSharedFromCommunity>[1] | null,
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
          const sharedKey =
            sharedIdFromCommunityAppId(appId) ||
            (appId.startsWith("capp-shared-") ? appId : null);
          if (sharedKey && bridgePatch) {
            const patch = bridgePatch(enriched);
            if (patch) updateSharedFromCommunity(sharedKey, patch);
          } else if (sharedKey) {
            updateSharedFromCommunity(sharedKey, {
              status: enriched.status,
              infoRequest: enriched.infoRequest,
              documentRequest: enriched.documentRequest,
              tourProposal: enriched.tourProposal,
              assessmentProposal: enriched.assessmentProposal,
              waitlistPosition: enriched.waitlistPosition,
              decisionKind: decisionKindFromStatus(enriched.status),
              decisionNote: auditAction,
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
    (appId: string, note?: string) =>
      mutateApp(
        appId,
        "acceptDecline",
        (a) => ({
          ...a,
          status: "approved" as ApplicationStatus,
          transitionChecklist: a.transitionChecklist ?? {},
          moveInConfirmed: a.moveInConfirmed ?? null,
        }),
        note?.trim()
          ? `Accepted · ${note.trim()} · moved to transition`
          : "Accepted · moved to transition",
      ),
    [mutateApp],
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

  const updateProfile = useCallback(
    (patch: Partial<CommunityProfile>) => {
      if (!can("editProfile") && !can("editPricing") && !can("editAdmissions")) {
        return { ok: false, error: "You don’t have permission to edit the profile." };
      }
      persist((ws) =>
        pushAudit(
          { ...ws, profile: { ...ws.profile, ...patch } },
          "Updated community profile",
        ),
      );
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
