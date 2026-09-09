/**
 * Server contract for application-scoped messaging.
 * One conversation per admissions application (mirrors supabase/migrations/0004
 * `conversations.application_id` unique constraint).
 *
 * `kind`/`meta` piggy-back on the `attachments` jsonb column (no schema change):
 * see local-store.ts / supabase-store.ts `encodeAttachments`/`decodeAttachments`.
 */

export type MessageSenderRole = "family" | "staff";

export type MessageKind = "text" | "document-request" | "visit" | "admission" | "attachment" | "system";

export type StoredAttachment = { name: string; size: string };

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  kind: MessageKind;
  meta: string | null;
  attachments: StoredAttachment[];
  createdAt: string;
  readByFamily: boolean;
  readByCommunity: boolean;
};

export type ConversationRecord = {
  id: string;
  applicationId: string;
  familyUserId: string;
  siteId: string;
  siteName: string;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationWithMessages = {
  conversation: ConversationRecord;
  messages: MessageRecord[];
};

export type MessagingRepositoryError = { ok: false; status: number; error: string };
export type MessagingResult<T> = { ok: true; data: T } | MessagingRepositoryError;

export function isMessageKind(value: unknown): value is MessageKind {
  return (
    typeof value === "string" &&
    ["text", "document-request", "visit", "admission", "attachment", "system"].includes(value)
  );
}
