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
import {
  seedInternalWorkspace,
  type AuditActionType,
  type InternalWorkspace,
  type ModerationStatus,
  type PartnershipStatus,
  type PlatformUserStatus,
} from "@/lib/internal-admin";

const STORAGE_KEY = "haven-internal-admin-v1";

type InternalAdminContextValue = {
  ready: boolean;
  workspace: InternalWorkspace | null;
  suspendUser: (userId: string, reason?: string) => void;
  reactivateUser: (userId: string) => void;
  setCommunityStatus: (
    communityId: string,
    status: PartnershipStatus,
    note?: string,
  ) => void;
  setCommunityVerified: (communityId: string, verified: boolean) => void;
  updateCommunityPublished: (
    communityId: string,
    patch: { publishedPriceFrom?: number | null; publishedBeds?: number; waitlistPublished?: number },
  ) => void;
  resolveModeration: (itemId: string, status: ModerationStatus) => void;
  interveneApplication: (appId: string, note: string) => void;
  logAdminAction: (summary: string, resource: string, actionType?: AuditActionType) => void;
};

const InternalAdminContext = createContext<InternalAdminContextValue | null>(null);

function readWs(): InternalWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InternalWorkspace;
  } catch {
    return null;
  }
}

function writeWs(ws: InternalWorkspace) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
}

export function InternalAdminProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [workspace, setWorkspace] = useState<InternalWorkspace | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "internal") {
      setWorkspace(null);
      setReady(true);
      return;
    }
    const existing = readWs();
    if (existing) {
      setWorkspace(existing);
    } else {
      const seeded = seedInternalWorkspace();
      writeWs(seeded);
      setWorkspace(seeded);
    }
    setReady(true);
  }, [authReady, user]);

  const persist = useCallback((updater: (prev: InternalWorkspace) => InternalWorkspace) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      writeWs(next);
      return next;
    });
  }, []);

  const actor = user?.name || "Haven Ops";

  const pushAudit = useCallback(
    (
      ws: InternalWorkspace,
      summary: string,
      resource: string,
      actionType: AuditActionType = "admin_action",
    ): InternalWorkspace => ({
      ...ws,
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          id: `aud-${Date.now()}`,
          at: new Date().toISOString(),
          actor,
          actorRole: "internal",
          actionType,
          summary,
          resource,
        },
        ...ws.auditLog,
      ],
    }),
    [actor],
  );

  const suspendUser = useCallback(
    (userId: string, reason?: string) => {
      persist((ws) => {
        const u = ws.users.find((x) => x.id === userId);
        return pushAudit(
          {
            ...ws,
            users: ws.users.map((x) =>
              x.id === userId
                ? {
                    ...x,
                    status: "suspended" as PlatformUserStatus,
                    notes: reason || x.notes,
                    incidentCount: x.incidentCount + (reason ? 1 : 0),
                  }
                : x,
            ),
          },
          `Suspended user ${u?.email || userId}${reason ? ` · ${reason}` : ""}`,
          userId,
        );
      });
    },
    [persist, pushAudit],
  );

  const reactivateUser = useCallback(
    (userId: string) => {
      persist((ws) => {
        const u = ws.users.find((x) => x.id === userId);
        return pushAudit(
          {
            ...ws,
            users: ws.users.map((x) =>
              x.id === userId ? { ...x, status: "active" as PlatformUserStatus } : x,
            ),
          },
          `Reactivated user ${u?.email || userId}`,
          userId,
        );
      });
    },
    [persist, pushAudit],
  );

  const setCommunityStatus = useCallback(
    (communityId: string, status: PartnershipStatus, note?: string) => {
      persist((ws) => {
        const c = ws.communities.find((x) => x.id === communityId);
        return pushAudit(
          {
            ...ws,
            communities: ws.communities.map((x) =>
              x.id === communityId
                ? {
                    ...x,
                    status,
                    lastReviewedAt: new Date().toISOString(),
                    verifiedProfile: status === "verified" ? true : x.verifiedProfile,
                    flags: note ? [...new Set([...x.flags, note])] : x.flags,
                  }
                : x,
            ),
          },
          `Community ${c?.name || communityId} → ${status}${note ? ` · ${note}` : ""}`,
          communityId,
        );
      });
    },
    [persist, pushAudit],
  );

  const setCommunityVerified = useCallback(
    (communityId: string, verified: boolean) => {
      persist((ws) => {
        const c = ws.communities.find((x) => x.id === communityId);
        return pushAudit(
          {
            ...ws,
            communities: ws.communities.map((x) =>
              x.id === communityId
                ? {
                    ...x,
                    verifiedProfile: verified,
                    status: verified && x.status === "approved" ? "verified" : x.status,
                    lastReviewedAt: new Date().toISOString(),
                  }
                : x,
            ),
          },
          `${verified ? "Marked verified" : "Removed verified mark"} · ${c?.name || communityId}`,
          communityId,
        );
      });
    },
    [persist, pushAudit],
  );

  const updateCommunityPublished = useCallback(
    (
      communityId: string,
      patch: {
        publishedPriceFrom?: number | null;
        publishedBeds?: number;
        waitlistPublished?: number;
      },
    ) => {
      persist((ws) => {
        const c = ws.communities.find((x) => x.id === communityId);
        return pushAudit(
          {
            ...ws,
            communities: ws.communities.map((x) =>
              x.id === communityId ? { ...x, ...patch } : x,
            ),
          },
          `Updated published pricing/availability · ${c?.name || communityId}`,
          communityId,
        );
      });
    },
    [persist, pushAudit],
  );

  const resolveModeration = useCallback(
    (itemId: string, status: ModerationStatus) => {
      persist((ws) => {
        const item = ws.moderation.find((m) => m.id === itemId);
        return pushAudit(
          {
            ...ws,
            moderation: ws.moderation.map((m) =>
              m.id === itemId ? { ...m, status } : m,
            ),
          },
          `Moderation ${status} · ${item?.title || itemId}`,
          itemId,
        );
      });
    },
    [persist, pushAudit],
  );

  const interveneApplication = useCallback(
    (appId: string, note: string) => {
      const trimmed = note.trim();
      if (!trimmed) return;
      persist((ws) => {
        const app = ws.applications.find((a) => a.id === appId);
        return pushAudit(
          {
            ...ws,
            applications: ws.applications.map((a) =>
              a.id === appId
                ? {
                    ...a,
                    health: "on_track" as const,
                    disputeNote: a.health === "dispute" ? `Resolved: ${trimmed}` : a.disputeNote,
                    lastActivityAt: new Date().toISOString(),
                    activityLog: [
                      ...a.activityLog,
                      {
                        at: new Date().toISOString(),
                        actor: actor,
                        action: `Admin intervention (details redacted): ${trimmed.slice(0, 80)}`,
                      },
                    ],
                  }
                : a,
            ),
          },
          `Intervened on application ${app?.seniorName || appId}`,
          appId,
        );
      });
    },
    [actor, persist, pushAudit],
  );

  const logAdminAction = useCallback(
    (summary: string, resource: string, actionType: AuditActionType = "admin_action") => {
      persist((ws) => pushAudit(ws, summary, resource, actionType));
    },
    [persist, pushAudit],
  );

  const value = useMemo(
    () => ({
      ready,
      workspace,
      suspendUser,
      reactivateUser,
      setCommunityStatus,
      setCommunityVerified,
      updateCommunityPublished,
      resolveModeration,
      interveneApplication,
      logAdminAction,
    }),
    [
      ready,
      workspace,
      suspendUser,
      reactivateUser,
      setCommunityStatus,
      setCommunityVerified,
      updateCommunityPublished,
      resolveModeration,
      interveneApplication,
      logAdminAction,
    ],
  );

  return (
    <InternalAdminContext.Provider value={value}>{children}</InternalAdminContext.Provider>
  );
}

export function useInternalAdmin() {
  const ctx = useContext(InternalAdminContext);
  if (!ctx) throw new Error("useInternalAdmin must be used within InternalAdminProvider");
  return ctx;
}
