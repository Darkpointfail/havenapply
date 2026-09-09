"use client";

/**
 * Browser client for the messaging API.
 * Data wiring only: no component, class or markup depends on this module.
 * Mirrors src/lib/admissions/client-api.ts conventions.
 */

import type {
  ConversationRecord,
  ConversationWithMessages,
  MessageKind,
  MessageRecord,
  MessageSenderRole,
  StoredAttachment,
} from "@/lib/messaging-server/types";

type Envelope<T> = { ok: boolean; error?: string } & Partial<T>;

async function csrfHeader(): Promise<Record<string, string>> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)haven_csrf=([^;]+)/);
    if (match) return { "x-haven-csrf": decodeURIComponent(match[1]) };
    const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    const json = (await res.json()) as { csrfToken?: string };
    return json.csrfToken ? { "x-haven-csrf": json.csrfToken } : {};
  } catch {
    return {};
  }
}

async function call<T>(input: RequestInfo, init?: RequestInit): Promise<Envelope<T> | null> {
  try {
    const method = (init?.method ?? "GET").toUpperCase();
    const extra = method === "GET" ? {} : await csrfHeader();
    const res = await fetch(input, {
      credentials: "same-origin",
      ...init,
      headers: { "Content-Type": "application/json", ...extra, ...(init?.headers ?? {}) },
    });
    const json = (await res.json()) as Envelope<T>;
    if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}` } as Envelope<T>;
    return json;
  } catch {
    return null;
  }
}

export async function apiListConversations() {
  return call<{ threads: ConversationWithMessages[]; viewerRole: MessageSenderRole }>("/api/messages");
}

export async function apiGetOrStartConversation(applicationId: string) {
  return call<{ conversation: ConversationRecord; messages: MessageRecord[]; viewerRole: MessageSenderRole }>(
    `/api/messages/${encodeURIComponent(applicationId)}`,
  );
}

export async function apiSendMessage(
  applicationId: string,
  input: { text: string; kind?: MessageKind; meta?: string; attachments?: StoredAttachment[] },
) {
  return call<{ conversation: ConversationRecord; message: MessageRecord }>(
    `/api/messages/${encodeURIComponent(applicationId)}`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function apiMarkMessagesRead(applicationId: string) {
  return call<Record<string, never>>(`/api/messages/${encodeURIComponent(applicationId)}/read`, {
    method: "POST",
  });
}
