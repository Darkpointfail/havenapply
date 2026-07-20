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
  createThread,
  detectSensitiveContent,
  formatMessageTime,
  residencesForCommunityOrg,
  seedThreads,
  unreadForRole,
  type ConversationScope,
  type MessageThread,
  type SecureMessage,
} from "@/lib/messaging";

const SHARED_KEY = "haven-messages-v1";

type MessagingContextValue = {
  ready: boolean;
  threads: MessageThread[];
  visibleThreads: MessageThread[];
  unreadTotal: number;
  sendMessage: (
    threadId: string,
    text: string,
    opts?: {
      type?: SecureMessage["type"];
      meta?: string;
      attachments?: { name: string; size: string }[];
      forceSensitive?: boolean;
    },
  ) => { ok: boolean; sensitiveFlags?: string[] };
  markThreadRead: (threadId: string) => void;
  archiveThread: (threadId: string, archived?: boolean) => void;
  startConversation: (input: {
    scope: ConversationScope;
    residenceId: string;
    residenceName: string;
    avatar: string;
    applicationId?: string | null;
    subject: string;
    firstMessage: string;
    familyEmail?: string;
    fromRole?: "family" | "community";
  }) => string;
  authorizeFamilyMember: (threadId: string, email: string) => void;
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

function readShared(): MessageThread[] | null {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MessageThread[];
  } catch {
    return null;
  }
}

function writeShared(threads: MessageThread[]) {
  localStorage.setItem(SHARED_KEY, JSON.stringify(threads));
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setThreads([]);
      setReady(true);
      return;
    }

    const existing = readShared();
    if (existing?.length) {
      setThreads(existing);
    } else {
      const seeded = seedThreads(user.role === "family" ? user.email : "family@demo.haven");
      setThreads(seeded);
      writeShared(seeded);
    }
    setReady(true);
  }, [authReady, user]);

  // Cross-tab / cross-role sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_KEY || !e.newValue) return;
      try {
        setThreads(JSON.parse(e.newValue) as MessageThread[]);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback(
    (updater: MessageThread[] | ((prev: MessageThread[]) => MessageThread[])) => {
      setThreads((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeShared(next);
        return next;
      });
    },
    [],
  );

  const visibleThreads = useMemo(() => {
    if (!user) return [];
    const email = user.email.toLowerCase();

    if (user.role === "family") {
      return threads.filter((t) =>
        t.authorizedFamilyEmails.map((e) => e.toLowerCase()).includes(email),
      );
    }

    if (user.role === "community") {
      const allowed = residencesForCommunityOrg(user.organization, user.email);
      return threads.filter((t) => allowed.includes(t.residenceId));
    }

    // Internal: all threads (oversight)
    return threads;
  }, [threads, user]);

  const unreadTotal = useMemo(() => {
    if (!user) return 0;
    const role = user.role === "community" ? "community" : "family";
    return visibleThreads
      .filter((t) => !(role === "family" ? t.archivedByFamily : t.archivedByCommunity))
      .reduce((sum, t) => sum + unreadForRole(t, role), 0);
  }, [visibleThreads, user]);

  const sendMessage = useCallback(
    (
      threadId: string,
      text: string,
      opts?: {
        type?: SecureMessage["type"];
        meta?: string;
        attachments?: { name: string; size: string }[];
        forceSensitive?: boolean;
      },
    ) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return { ok: false };

      const flags = detectSensitiveContent(trimmed);
      if (flags.length && !opts?.forceSensitive) {
        return { ok: false, sensitiveFlags: flags };
      }

      const now = new Date();
      const fromRole = user.role === "community" ? "community" : "family";
      const msg: SecureMessage = {
        id: `msg-${now.getTime()}`,
        fromRole,
        senderName: user.name || (fromRole === "family" ? "Family" : "Admissions"),
        senderRole:
          fromRole === "family"
            ? "Family member"
            : user.organization
              ? `${user.organization} admissions`
              : "Community admissions",
        text: trimmed,
        time: formatMessageTime(now),
        timestamp: now.toISOString(),
        delivery: "sent",
        type: opts?.type || (opts?.attachments?.length ? "attachment" : "text"),
        meta: opts?.meta,
        attachments: opts?.attachments,
        readByFamily: fromRole === "family",
        readByCommunity: fromRole === "community",
      };

      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            updatedAt: now.toISOString(),
            messages: [...t.messages, { ...msg, delivery: "delivered" as const }],
            auditLog: [
              ...t.auditLog,
              {
                id: `aud-${now.getTime()}`,
                at: now.toISOString(),
                actor: msg.senderName,
                action: opts?.attachments?.length
                  ? `Sent message with ${opts.attachments.length} attachment(s)`
                  : "Sent message",
              },
            ],
          };
        }),
      );

      window.setTimeout(() => {
        persist((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === msg.id ? { ...m, delivery: "delivered" } : m,
              ),
            };
          }),
        );
      }, 600);

      return { ok: true };
    },
    [persist, user],
  );

  const markThreadRead = useCallback(
    (threadId: string) => {
      if (!user) return;
      const asFamily = user.role !== "community";
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) => ({
              ...m,
              readByFamily: asFamily ? true : m.readByFamily,
              readByCommunity: !asFamily ? true : m.readByCommunity,
              delivery:
                (asFamily && m.fromRole === "community") || (!asFamily && m.fromRole === "family")
                  ? "read"
                  : m.delivery,
            })),
            auditLog: [
              ...t.auditLog,
              {
                id: `aud-read-${Date.now()}`,
                at: new Date().toISOString(),
                actor: user.name || "User",
                action: "Opened conversation (marked read)",
              },
            ],
          };
        }),
      );
    },
    [persist, user],
  );

  const archiveThread = useCallback(
    (threadId: string, archived = true) => {
      if (!user) return;
      const asFamily = user.role !== "community";
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            archivedByFamily: asFamily ? archived : t.archivedByFamily,
            archivedByCommunity: !asFamily ? archived : t.archivedByCommunity,
            auditLog: [
              ...t.auditLog,
              {
                id: `aud-arch-${Date.now()}`,
                at: new Date().toISOString(),
                actor: user.name || "User",
                action: archived ? "Archived conversation" : "Restored conversation",
              },
            ],
          };
        }),
      );
    },
    [persist, user],
  );

  const startConversation = useCallback(
    (input: {
      scope: ConversationScope;
      residenceId: string;
      residenceName: string;
      avatar: string;
      applicationId?: string | null;
      subject: string;
      firstMessage: string;
      familyEmail?: string;
      fromRole?: "family" | "community";
    }) => {
      if (!user) return "";
      const familyEmail = (input.familyEmail || user.email).toLowerCase();
      const fromRole =
        input.fromRole || (user.role === "community" ? "community" : "family");
      const thread = createThread({
        ...input,
        familyEmail,
        fromRole,
        senderName: user.name || (fromRole === "community" ? "Admissions" : "Family"),
        senderRole: fromRole === "community" ? "Admissions" : "Primary contact",
      });
      // Also authorize demo family so community↔family demo works
      if (familyEmail !== "family@demo.haven") {
        thread.authorizedFamilyEmails.push("family@demo.haven");
      }
      persist((prev) => [thread, ...prev]);
      return thread.id;
    },
    [persist, user],
  );

  const authorizeFamilyMember = useCallback(
    (threadId: string, email: string) => {
      const e = email.trim().toLowerCase();
      if (!e || !user) return;
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          if (t.authorizedFamilyEmails.includes(e)) return t;
          return {
            ...t,
            authorizedFamilyEmails: [...t.authorizedFamilyEmails, e],
            auditLog: [
              ...t.auditLog,
              {
                id: `aud-auth-${Date.now()}`,
                at: new Date().toISOString(),
                actor: user.name || "User",
                action: `Authorized family member ${e}`,
              },
            ],
          };
        }),
      );
    },
    [persist, user],
  );

  const value = useMemo(
    () => ({
      ready,
      threads,
      visibleThreads,
      unreadTotal,
      sendMessage,
      markThreadRead,
      archiveThread,
      startConversation,
      authorizeFamilyMember,
    }),
    [
      ready,
      threads,
      visibleThreads,
      unreadTotal,
      sendMessage,
      markThreadRead,
      archiveThread,
      startConversation,
      authorizeFamilyMember,
    ],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error("useMessaging must be used within MessagingProvider");
  return ctx;
}
