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
import { images } from "@/data/images";
import {
  apiGetOrStartConversation,
  apiListConversations,
  apiMarkMessagesRead,
  apiSendMessage,
} from "@/lib/messaging-server/client-api";
import type {
  ConversationRecord,
  MessageRecord,
} from "@/lib/messaging-server/types";
import {
  createThread,
  detectSensitiveContent,
  formatMessageTime,
  residencesForCommunityOrg,
  unreadForRole,
  type ConversationScope,
  type MessageThread,
  type SecureMessage,
} from "@/lib/messaging";

/**
 * Two thread sources:
 * - "server" threads (scope "application"): persisted via /api/messages,
 *   one per admissions application — real, cross-device.
 * - "local" threads (scope "general" | "community"): unchanged demo
 *   behaviour, browser-only via localStorage. Pre-application inquiries
 *   aren't modelled server-side yet.
 *
 * Server thread ids are prefixed so callers can route without a lookup.
 */
const SERVER_PREFIX = "server:";
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
  ) => Promise<{ ok: boolean; sensitiveFlags?: string[] }>;
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
  }) => Promise<string>;
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

function messageRecordToSecure(m: MessageRecord): SecureMessage {
  return {
    id: m.id,
    fromRole: m.senderRole === "staff" ? "community" : "family",
    senderName: m.senderName,
    senderRole: m.senderRole === "staff" ? "Admissions" : "Primary contact",
    text: m.body,
    time: formatMessageTime(new Date(m.createdAt)),
    timestamp: m.createdAt,
    delivery: "delivered",
    type: m.kind,
    meta: m.meta ?? undefined,
    attachments: m.attachments.length ? m.attachments : undefined,
    readByFamily: m.readByFamily,
    readByCommunity: m.readByCommunity,
  };
}

function conversationToThread(
  conversation: ConversationRecord,
  messages: MessageRecord[],
  archived: { family: boolean; community: boolean },
): MessageThread {
  return {
    id: `${SERVER_PREFIX}${conversation.applicationId}`,
    scope: "application",
    residenceId: conversation.siteId,
    residenceName: conversation.siteName || "Residence",
    applicationId: conversation.applicationId,
    subject: conversation.subject || `Application · ${conversation.siteName || ""}`,
    avatar: images.community,
    authorizedFamilyEmails: [],
    archivedByFamily: archived.family,
    archivedByCommunity: archived.community,
    messages: messages.map(messageRecordToSecure),
    auditLog: [],
    updatedAt: conversation.updatedAt,
  };
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [localThreads, setLocalThreads] = useState<MessageThread[]>([]);
  const [serverThreads, setServerThreads] = useState<MessageThread[]>([]);
  const [archivedOverrides, setArchivedOverrides] = useState<
    Record<string, { family: boolean; community: boolean }>
  >({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLocalThreads([]);
      setServerThreads([]);
      setReady(true);
      return;
    }

    // Local demo threads: general / community scope only (unchanged mechanics).
    const existing = readShared();
    const localOnly = (existing ?? []).filter((t) => t.scope !== "application");
    setLocalThreads(localOnly);
    if (!existing) writeShared([]);

    // Real, server-persisted application threads.
    if (user.role === "family" || isFacilityRole(user.role)) {
      apiListConversations().then((res) => {
        if (res?.ok && res.threads) {
          setServerThreads(
            res.threads.map((c) =>
              conversationToThread(c.conversation, c.messages, {
                family: false,
                community: false,
              }),
            ),
          );
        }
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, [authReady, user]);

  // Cross-tab sync for local (demo) threads only.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_KEY || !e.newValue) return;
      try {
        const next = (JSON.parse(e.newValue) as MessageThread[]).filter((t) => t.scope !== "application");
        setLocalThreads(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persistLocal = useCallback(
    (updater: MessageThread[] | ((prev: MessageThread[]) => MessageThread[])) => {
      setLocalThreads((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeShared(next);
        return next;
      });
    },
    [],
  );

  const threads = useMemo(() => [...serverThreads, ...localThreads], [serverThreads, localThreads]);

  const visibleThreads = useMemo(() => {
    if (!user) return [];
    const email = user.email.toLowerCase();

    let localVisible: MessageThread[] = [];
    if (user.role === "family") {
      localVisible = localThreads.filter((t) =>
        t.authorizedFamilyEmails.map((e) => e.toLowerCase()).includes(email),
      );
    } else if (isFacilityRole(user.role)) {
      const allowed = residencesForCommunityOrg(user.organization, user.email);
      localVisible = localThreads.filter((t) => allowed.includes(t.residenceId));
    } else if (user.role === "internal") {
      localVisible = localThreads;
    }

    return [...serverThreads, ...localVisible];
  }, [serverThreads, localThreads, user]);

  const unreadTotal = useMemo(() => {
    if (!user) return 0;
    if (user.role === "professional") return 0;
    const role = isFacilityRole(user.role) ? "community" : "family";
    return visibleThreads
      .filter((t) => !(role === "family" ? t.archivedByFamily : t.archivedByCommunity))
      .reduce((sum, t) => sum + unreadForRole(t, role), 0);
  }, [visibleThreads, user]);

  const sendMessage = useCallback(
    async (
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

      if (threadId.startsWith(SERVER_PREFIX)) {
        const applicationId = threadId.slice(SERVER_PREFIX.length);
        const res = await apiSendMessage(applicationId, {
          text: trimmed,
          kind: opts?.type,
          meta: opts?.meta,
          attachments: opts?.attachments,
        });
        if (!res?.ok || !res.message) return { ok: false };
        const record = res.message;
        setServerThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  updatedAt: record.createdAt,
                  messages: [...t.messages, messageRecordToSecure(record)],
                }
              : t,
          ),
        );
        return { ok: true };
      }

      const now = new Date();
      const fromRole = isFacilityRole(user.role) ? "community" : "family";
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

      persistLocal((prev) =>
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

      return { ok: true };
    },
    [persistLocal, user],
  );

  const markThreadRead = useCallback(
    (threadId: string) => {
      if (!user) return;
      const asFamily = !isFacilityRole(user.role);

      if (threadId.startsWith(SERVER_PREFIX)) {
        const applicationId = threadId.slice(SERVER_PREFIX.length);
        setServerThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              messages: t.messages.map((m) => ({
                ...m,
                readByFamily: asFamily ? true : m.readByFamily,
                readByCommunity: !asFamily ? true : m.readByCommunity,
              })),
            };
          }),
        );
        void apiMarkMessagesRead(applicationId);
        return;
      }

      persistLocal((prev) =>
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
    [persistLocal, user],
  );

  /** Archive is client-side only for server threads (not modelled server-side yet). */
  const archiveThread = useCallback(
    (threadId: string, archived = true) => {
      if (!user) return;
      const asFamily = !isFacilityRole(user.role);

      if (threadId.startsWith(SERVER_PREFIX)) {
        setArchivedOverrides((prev) => ({
          ...prev,
          [threadId]: {
            family: asFamily ? archived : prev[threadId]?.family ?? false,
            community: !asFamily ? archived : prev[threadId]?.community ?? false,
          },
        }));
        setServerThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  archivedByFamily: asFamily ? archived : t.archivedByFamily,
                  archivedByCommunity: !asFamily ? archived : t.archivedByCommunity,
                }
              : t,
          ),
        );
        return;
      }

      persistLocal((prev) =>
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
    [persistLocal, user],
  );

  const startConversation = useCallback(
    async (input: {
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

      if (input.scope === "application" && input.applicationId) {
        const applicationId = input.applicationId;
        const started = await apiGetOrStartConversation(applicationId);
        if (!started?.ok || !started.conversation) return "";

        const threadId = `${SERVER_PREFIX}${applicationId}`;
        let messages = started.messages ?? [];

        const firstMessage = input.firstMessage.trim();
        if (firstMessage) {
          const sent = await apiSendMessage(applicationId, { text: firstMessage });
          if (sent?.ok && sent.message) messages = [...messages, sent.message];
        }

        const archived = archivedOverrides[threadId] ?? { family: false, community: false };
        const thread = conversationToThread(started.conversation, messages, archived);
        setServerThreads((prev) => [thread, ...prev.filter((t) => t.id !== threadId)]);
        return threadId;
      }

      const familyEmail = (input.familyEmail || user.email).toLowerCase();
      const fromRole = input.fromRole || (isFacilityRole(user.role) ? "community" : "family");
      const thread = createThread({
        ...input,
        familyEmail,
        fromRole,
        senderName: user.name || (fromRole === "community" ? "Admissions" : "Family"),
        senderRole: fromRole === "community" ? "Admissions" : "Primary contact",
      });
      if (familyEmail !== "family@demo.haven") {
        thread.authorizedFamilyEmails.push("family@demo.haven");
      }
      persistLocal((prev) => [thread, ...prev]);
      return thread.id;
    },
    [archivedOverrides, persistLocal, user],
  );

  /** Access to server threads is enforced server-side; this only applies to local demo threads. */
  const authorizeFamilyMember = useCallback(
    (threadId: string, email: string) => {
      const e = email.trim().toLowerCase();
      if (!e || !user || threadId.startsWith(SERVER_PREFIX)) return;
      persistLocal((prev) =>
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
    [persistLocal, user],
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
