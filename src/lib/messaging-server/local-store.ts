/**
 * Server-authoritative messaging store (filesystem under .data/).
 * Used when NEXT_PUBLIC_DATA_BACKEND is not "supabase".
 *
 * Mirrors src/lib/admissions/local-store.ts conventions: atomic writes,
 * single write-chain to serialize concurrent route handlers.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ConversationRecord,
  MessageKind,
  MessageRecord,
  MessageSenderRole,
  StoredAttachment,
} from "@/lib/messaging-server/types";

const ROOT = path.join(process.cwd(), ".data", "messaging");
const STATE_FILE = path.join(ROOT, "state.json");

type ReadRow = { messageId: string; userId: string; role: MessageSenderRole; readAt: string };

type MessagingState = {
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  reads: ReadRow[];
};

const EMPTY_STATE: MessagingState = { conversations: [], messages: [], reads: [] };

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

async function readState(): Promise<MessagingState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<MessagingState>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      reads: Array.isArray(parsed.reads) ? parsed.reads : [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(state: MessagingState) {
  await fs.mkdir(ROOT, { recursive: true });
  const tmp = `${STATE_FILE}.tmp-${randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, STATE_FILE);
}

let writeChain: Promise<unknown> = Promise.resolve();

function withState<T>(fn: (state: MessagingState) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const state = await readState();
    const result = await fn(state);
    await writeState(state);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function deriveReadFlags(messageId: string, reads: ReadRow[], senderRole: MessageSenderRole) {
  const readers = reads.filter((r) => r.messageId === messageId);
  return {
    readByFamily: senderRole === "family" || readers.some((r) => r.role === "family"),
    readByCommunity: senderRole === "staff" || readers.some((r) => r.role === "staff"),
  };
}

function toPublicMessage(row: MessageRecord, reads: ReadRow[]): MessageRecord {
  return { ...row, ...deriveReadFlags(row.id, reads, row.senderRole) };
}

export async function getOrCreateConversation(args: {
  applicationId: string;
  familyUserId: string;
  siteId: string;
  siteName: string;
  subject?: string | null;
}): Promise<ConversationRecord> {
  return withState((state) => {
    const existing = state.conversations.find((c) => c.applicationId === args.applicationId);
    if (existing) return existing;
    const at = nowIso();
    const created: ConversationRecord = {
      id: newId("conv"),
      applicationId: args.applicationId,
      familyUserId: args.familyUserId,
      siteId: args.siteId,
      siteName: args.siteName,
      subject: args.subject ?? null,
      createdAt: at,
      updatedAt: at,
    };
    state.conversations = [...state.conversations, created];
    return created;
  });
}

export async function getConversationByApplication(
  applicationId: string,
): Promise<ConversationRecord | null> {
  const state = await readState();
  return state.conversations.find((c) => c.applicationId === applicationId) ?? null;
}

export async function listConversationsForFamily(
  familyUserId: string,
): Promise<ConversationRecord[]> {
  const state = await readState();
  return state.conversations
    .filter((c) => c.familyUserId === familyUserId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listConversationsForSites(siteIds: string[]): Promise<ConversationRecord[]> {
  const state = await readState();
  const allowed = new Set(siteIds);
  return state.conversations
    .filter((c) => allowed.has(c.siteId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMessages(conversationId: string): Promise<MessageRecord[]> {
  const state = await readState();
  return state.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => toPublicMessage(m, state.reads));
}

export async function sendMessage(args: {
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  kind: MessageKind;
  meta?: string | null;
  attachments?: StoredAttachment[];
}): Promise<MessageRecord> {
  return withState((state) => {
    const at = nowIso();
    const message: MessageRecord = {
      id: newId("msg"),
      conversationId: args.conversationId,
      senderId: args.senderId,
      senderRole: args.senderRole,
      senderName: args.senderName,
      body: args.body,
      kind: args.kind,
      meta: args.meta ?? null,
      attachments: args.attachments ?? [],
      createdAt: at,
      readByFamily: args.senderRole === "family",
      readByCommunity: args.senderRole === "staff",
    };
    state.messages = [...state.messages, message];
    state.conversations = state.conversations.map((c) =>
      c.id === args.conversationId ? { ...c, updatedAt: at } : c,
    );
    return message;
  });
}

export async function markRead(args: {
  conversationId: string;
  userId: string;
  role: MessageSenderRole;
}): Promise<void> {
  await withState((state) => {
    const at = nowIso();
    const unread = state.messages.filter(
      (m) => m.conversationId === args.conversationId && m.senderRole !== args.role,
    );
    for (const m of unread) {
      const already = state.reads.some((r) => r.messageId === m.id && r.userId === args.userId);
      if (!already) {
        state.reads = [...state.reads, { messageId: m.id, userId: args.userId, role: args.role, readAt: at }];
      }
    }
  });
}

export async function __resetMessagingForTests() {
  await writeState({ ...EMPTY_STATE });
}
