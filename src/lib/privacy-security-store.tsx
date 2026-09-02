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
  changeAccountPassword,
  requestAccountDeletion as requestAccountDeletionAuth,
} from "@/lib/auth-store";
import {
  isLinkExpired,
  linkExpiresAt,
  seedPrivacyWorkspace,
  COMPLIANCE_DISCLAIMER,
  type AccessEvent,
  type PrivacyPreferences,
  type PrivacyWorkspace,
  type SensitiveLink,
} from "@/lib/privacy-security";

const STORAGE_KEY = "haven-privacy-v1";

type PrivacyContextValue = {
  ready: boolean;
  workspace: PrivacyWorkspace | null;
  logAccess: (event: Omit<AccessEvent, "id" | "at" | "actor"> & { actor?: string }) => void;
  revokeConsent: (consentId: string) => void;
  restoreConsent: (consentId: string) => void;
  updatePreferences: (patch: Partial<PrivacyPreferences>) => void;
  revokeSession: (sessionId: string) => void;
  revokeOtherSessions: () => void;
  createSensitiveLink: (label: string, hours?: number) => SensitiveLink | null;
  revokeSensitiveLink: (linkId: string) => void;
  requestDeletion: (note: string) => void;
  cancelDeletion: () => void;
  exportData: () => string;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function keyFor(email: string) {
  return `${STORAGE_KEY}-${email.toLowerCase()}`;
}

function read(email: string): PrivacyWorkspace | null {
  try {
    const raw = localStorage.getItem(keyFor(email));
    if (!raw) return null;
    return JSON.parse(raw) as PrivacyWorkspace;
  } catch {
    return null;
  }
}

function write(email: string, ws: PrivacyWorkspace) {
  localStorage.setItem(keyFor(email), JSON.stringify(ws));
}

export function PrivacySecurityProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady, signOut } = useAuth();
  const [workspace, setWorkspace] = useState<PrivacyWorkspace | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "family") {
      setWorkspace(null);
      setReady(true);
      return;
    }
    const existing = read(user.email);
    if (existing) {
      // Refresh expired links flag on load
      const links = existing.sensitiveLinks.map((l) =>
        isLinkExpired(l) && !l.revoked ? { ...l, revoked: false } : l,
      );
      // Touch current session
      const sessions = existing.sessions.map((s) =>
        s.current ? { ...s, lastActiveAt: new Date().toISOString() } : s,
      );
      const next = { ...existing, sensitiveLinks: links, sessions, updatedAt: new Date().toISOString() };
      write(user.email, next);
      setWorkspace(next);
    } else {
      const seeded = seedPrivacyWorkspace(user.name || "Family", user.email);
      write(user.email, seeded);
      setWorkspace(seeded);
    }
    setReady(true);
  }, [authReady, user]);

  const persist = useCallback(
    (updater: (prev: PrivacyWorkspace) => PrivacyWorkspace) => {
      setWorkspace((prev) => {
        if (!prev || !user) return prev;
        const next = updater(prev);
        write(user.email, next);
        return next;
      });
    },
    [user],
  );

  const logAccess = useCallback(
    (event: Omit<AccessEvent, "id" | "at" | "actor"> & { actor?: string }) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        updatedAt: new Date().toISOString(),
        accessLog: [
          {
            id: `ae-${Date.now()}`,
            at: new Date().toISOString(),
            actor: event.actor || user.name || "Family",
            action: event.action,
            resource: event.resource,
            detail: event.detail,
          },
          ...ws.accessLog,
        ],
      }));
    },
    [persist, user],
  );

  const revokeConsent = useCallback(
    (consentId: string) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        consents: ws.consents.map((c) =>
          c.id === consentId
            ? {
                ...c,
                active: false,
                revokedAt: new Date().toISOString(),
                revokedBy: user.name || "Family",
              }
            : c,
        ),
        accessLog: [
          {
            id: `ae-${Date.now()}`,
            at: new Date().toISOString(),
            actor: user.name || "Family",
            action: "revoke_share" as const,
            resource: ws.consents.find((c) => c.id === consentId)?.resourceLabel || consentId,
          },
          ...ws.accessLog,
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const restoreConsent = useCallback(
    (consentId: string) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        consents: ws.consents.map((c) =>
          c.id === consentId
            ? { ...c, active: true, revokedAt: null, revokedBy: null }
            : c,
        ),
        accessLog: [
          {
            id: `ae-${Date.now()}`,
            at: new Date().toISOString(),
            actor: user.name || "Family",
            action: "share" as const,
            resource: `Restored · ${ws.consents.find((c) => c.id === consentId)?.resourceLabel || consentId}`,
          },
          ...ws.accessLog,
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const updatePreferences = useCallback(
    (patch: Partial<PrivacyPreferences>) => {
      persist((ws) => ({
        ...ws,
        preferences: { ...ws.preferences, ...patch },
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  const revokeSession = useCallback(
    (sessionId: string) => {
      if (!user) return;
      persist((ws) => {
        const target = ws.sessions.find((s) => s.id === sessionId);
        if (target?.current) {
          // Signing out current session
          window.setTimeout(() => signOut(), 100);
        }
        return {
          ...ws,
          sessions: ws.sessions.filter((s) => s.id !== sessionId),
          accessLog: [
            {
              id: `ae-${Date.now()}`,
              at: new Date().toISOString(),
              actor: user.name || "Family",
              action: "session_revoke" as const,
              resource: target?.label || sessionId,
            },
            ...ws.accessLog,
          ],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [persist, signOut, user],
  );

  const revokeOtherSessions = useCallback(() => {
    if (!user) return;
    persist((ws) => ({
      ...ws,
      sessions: ws.sessions.filter((s) => s.current),
      accessLog: [
        {
          id: `ae-${Date.now()}`,
          at: new Date().toISOString(),
          actor: user.name || "Family",
          action: "session_revoke" as const,
          resource: "All other sessions",
        },
        ...ws.accessLog,
      ],
      updatedAt: new Date().toISOString(),
    }));
  }, [persist, user]);

  const createSensitiveLink = useCallback(
    (label: string, hours = 24) => {
      if (!user) return null;
      const link: SensitiveLink = {
        id: `lnk-${Date.now()}`,
        label: label.trim() || "Sensitive download link",
        createdAt: new Date().toISOString(),
        expiresAt: linkExpiresAt(hours),
        revoked: false,
      };
      persist((ws) => ({
        ...ws,
        sensitiveLinks: [link, ...ws.sensitiveLinks],
        updatedAt: new Date().toISOString(),
      }));
      return link;
    },
    [persist, user],
  );

  const revokeSensitiveLink = useCallback(
    (linkId: string) => {
      persist((ws) => ({
        ...ws,
        sensitiveLinks: ws.sensitiveLinks.map((l) =>
          l.id === linkId ? { ...l, revoked: true } : l,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  const requestDeletion = useCallback(
    (note: string) => {
      if (!user) return;
      requestAccountDeletionAuth(user.email);
      persist((ws) => ({
        ...ws,
        deletionRequest: {
          id: `del-${Date.now()}`,
          requestedAt: new Date().toISOString(),
          status: "pending",
          note: note.trim() || "Account deletion requested",
        },
        accessLog: [
          {
            id: `ae-${Date.now()}`,
            at: new Date().toISOString(),
            actor: user.name || "Family",
            action: "deletion_request" as const,
            resource: "Account",
            detail: note.trim() || undefined,
          },
          ...ws.accessLog,
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const cancelDeletion = useCallback(() => {
    persist((ws) => ({
      ...ws,
      deletionRequest: ws.deletionRequest
        ? { ...ws.deletionRequest, status: "cancelled" }
        : null,
      updatedAt: new Date().toISOString(),
    }));
  }, [persist]);

  const exportData = useCallback(() => {
    if (!workspace || !user) return "";
    logAccess({ action: "export", resource: "Personal data export (JSON)" });
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: { email: user.email, name: user.name, role: user.role },
        consents: workspace.consents,
        preferences: workspace.preferences,
        accessLog: workspace.accessLog.slice(0, 100),
        notice: COMPLIANCE_DISCLAIMER,
      },
      null,
      2,
    );
  }, [workspace, user, logAccess]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) return { ok: false, error: "Not signed in." };
      const res = await changeAccountPassword(user.email, currentPassword, newPassword);
      if (res.ok) {
        logAccess({ action: "password_change", resource: "Account password" });
      }
      return res;
    },
    [logAccess, user],
  );

  const value = useMemo(
    () => ({
      ready,
      workspace,
      logAccess,
      revokeConsent,
      restoreConsent,
      updatePreferences,
      revokeSession,
      revokeOtherSessions,
      createSensitiveLink,
      revokeSensitiveLink,
      requestDeletion,
      cancelDeletion,
      exportData,
      changePassword,
    }),
    [
      ready,
      workspace,
      logAccess,
      revokeConsent,
      restoreConsent,
      updatePreferences,
      revokeSession,
      revokeOtherSessions,
      createSensitiveLink,
      revokeSensitiveLink,
      requestDeletion,
      cancelDeletion,
      exportData,
      changePassword,
    ],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacySecurity() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacySecurity must be used within PrivacySecurityProvider");
  return ctx;
}

export function usePrivacySecurityOptional() {
  return useContext(PrivacyContext);
}
