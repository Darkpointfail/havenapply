/**
 * Backend-agnostic messaging repository.
 * Mirrors src/lib/admissions/repository.ts: one facade, two stores, selected
 * by NEXT_PUBLIC_DATA_BACKEND.
 */

import { isSupabaseBackend } from "@/lib/supabase/config";
import * as local from "@/lib/messaging-server/local-store";
import * as remote from "@/lib/messaging-server/supabase-store";
import type {
  ConversationRecord,
  MessageKind,
  MessageRecord,
  MessageSenderRole,
  StoredAttachment,
} from "@/lib/messaging-server/types";

export function getOrCreateConversation(args: {
  applicationId: string;
  familyUserId: string;
  siteId: string;
  siteName: string;
  subject?: string | null;
}): Promise<ConversationRecord> {
  return isSupabaseBackend() ? remote.getOrCreateConversation(args) : local.getOrCreateConversation(args);
}

export function getConversationByApplication(applicationId: string): Promise<ConversationRecord | null> {
  return isSupabaseBackend()
    ? remote.getConversationByApplication(applicationId)
    : local.getConversationByApplication(applicationId);
}

export function listConversationsForFamily(familyUserId: string): Promise<ConversationRecord[]> {
  return isSupabaseBackend()
    ? remote.listConversationsForFamily(familyUserId)
    : local.listConversationsForFamily(familyUserId);
}

export function listConversationsForSites(siteIds: string[]): Promise<ConversationRecord[]> {
  return isSupabaseBackend()
    ? remote.listConversationsForSites(siteIds)
    : local.listConversationsForSites(siteIds);
}

export function getMessages(conversationId: string, familyUserId: string): Promise<MessageRecord[]> {
  return isSupabaseBackend()
    ? remote.getMessages(conversationId, familyUserId)
    : local.getMessages(conversationId);
}

export function sendMessage(args: {
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  kind: MessageKind;
  meta?: string | null;
  attachments?: StoredAttachment[];
}): Promise<MessageRecord> {
  return isSupabaseBackend() ? remote.sendMessage(args) : local.sendMessage(args);
}

export function markRead(args: {
  conversationId: string;
  userId: string;
  role: MessageSenderRole;
}): Promise<void> {
  return isSupabaseBackend() ? remote.markRead(args) : local.markRead(args);
}
