/**
 * Supabase-backed messaging store.
 *
 * Reads/writes `conversations`, `messages`, `message_reads` (migration 0004).
 * RLS (`is_family_member` / `is_community_staff`) is defence in depth — the
 * caller is already scoped by the admissions authz layer before this runs.
 *
 * `kind`/`meta` piggy-back on the `attachments` jsonb column: no schema
 * change needed to carry them (see encodeAttachments/decodeAttachments).
 *
 * NOTE: like admissions/supabase-store.ts, this adapter is not exercised by
 * CI — no Supabase instance runs in the test environment. local-store.ts
 * implements the same contract and is what tests/E2E cover.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ConversationRecord,
  MessageKind,
  MessageRecord,
  MessageSenderRole,
  StoredAttachment,
} from "@/lib/messaging-server/types";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function encodeAttachments(kind: MessageKind, meta: string | null | undefined, files: StoredAttachment[]) {
  return { kind, meta: meta ?? null, files };
}

function decodeAttachments(raw: unknown): { kind: MessageKind; meta: string | null; files: StoredAttachment[] } {
  const obj = raw && typeof raw === "object" ? (raw as Row) : {};
  const files = Array.isArray(obj.files)
    ? (obj.files as Row[])
        .map((f) => ({ name: str(f?.name), size: str(f?.size) }))
        .filter((f) => f.name)
    : [];
  const kind = str(obj.kind, "text") as MessageKind;
  return { kind, meta: (obj.meta as string | null) ?? null, files };
}

function rowToConversation(row: Row): ConversationRecord {
  const community = row.communities && typeof row.communities === "object" ? (row.communities as Row) : null;
  return {
    id: str(row.id),
    applicationId: str(row.application_id),
    familyUserId: str(row.family_id),
    siteId: str(row.community_id),
    siteName: str(community?.name ?? (row as Row).site_name ?? ""),
    subject: (row.subject as string | null) ?? null,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

async function rowToMessage(
  row: Row,
  senderRoleByProfileId: Map<string, MessageSenderRole>,
  senderNameByProfileId: Map<string, string>,
  readerIds: Set<string>,
): Promise<MessageRecord> {
  const decoded = decodeAttachments(row.attachments);
  const senderId = str(row.sender_id);
  const senderRole = senderRoleByProfileId.get(senderId) ?? "family";
  return {
    id: str(row.id),
    conversationId: str(row.conversation_id),
    senderId,
    senderRole,
    senderName: senderNameByProfileId.get(senderId) ?? "",
    body: str(row.body),
    kind: decoded.kind,
    meta: decoded.meta,
    attachments: decoded.files,
    createdAt: str(row.created_at),
    readByFamily: senderRole === "family" || readerIds.has("family"),
    readByCommunity: senderRole === "staff" || readerIds.has("staff"),
  };
}

export async function getOrCreateConversation(args: {
  applicationId: string;
  familyUserId: string;
  siteId: string;
  siteName: string;
  subject?: string | null;
}): Promise<ConversationRecord> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("application_id", args.applicationId)
    .maybeSingle();
  if (existing) return rowToConversation({ ...existing, site_name: args.siteName });

  const { data: application } = await supabase
    .from("applications")
    .select("organization_id")
    .eq("id", args.applicationId)
    .single();

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      application_id: args.applicationId,
      family_id: args.familyUserId,
      community_id: args.siteId,
      organization_id: application?.organization_id,
      subject: args.subject ?? null,
    })
    .select("*")
    .single();
  if (error || !created) throw new Error(error?.message || "Failed to create conversation.");
  return rowToConversation({ ...created, site_name: args.siteName });
}

export async function getConversationByApplication(
  applicationId: string,
): Promise<ConversationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*, communities(name)")
    .eq("application_id", applicationId)
    .maybeSingle();
  return data ? rowToConversation(data) : null;
}

export async function listConversationsForFamily(
  familyUserId: string,
): Promise<ConversationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*, communities(name)")
    .eq("family_id", familyUserId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => rowToConversation(row));
}

export async function listConversationsForSites(siteIds: string[]): Promise<ConversationRecord[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*, communities(name)")
    .in("community_id", siteIds)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => rowToConversation(row));
}

/** Resolves sender role (family vs staff) per profile id for a batch of messages. */
async function resolveSenderRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  senderIds: string[],
  familyUserId: string,
): Promise<{ roleById: Map<string, MessageSenderRole>; nameById: Map<string, string> }> {
  const roleById = new Map<string, MessageSenderRole>();
  const nameById = new Map<string, string>();
  const unique = [...new Set(senderIds)];
  if (unique.length === 0) return { roleById, nameById };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", unique);
  for (const p of profiles ?? []) {
    const name = `${str(p.first_name)} ${str(p.last_name)}`.trim() || str(p.email);
    nameById.set(str(p.id), name);
    roleById.set(str(p.id), str(p.id) === familyUserId ? "family" : "staff");
  }
  return { roleById, nameById };
}

export async function getMessages(
  conversationId: string,
  familyUserId: string,
): Promise<MessageRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const list = rows ?? [];

  const { roleById, nameById } = await resolveSenderRoles(
    supabase,
    list.map((r) => str(r.sender_id)),
    familyUserId,
  );

  const messageIds = list.map((r) => str(r.id));
  const { data: reads } =
    messageIds.length > 0
      ? await supabase.from("message_reads").select("message_id, user_id").in("message_id", messageIds)
      : { data: [] as Row[] };

  const { roleById: readerRoleById } = await resolveSenderRoles(
    supabase,
    (reads ?? []).map((r) => str(r.user_id)),
    familyUserId,
  );
  const readerRolesByMessage = new Map<string, Set<string>>();
  for (const r of reads ?? []) {
    const mid = str(r.message_id);
    const role = readerRoleById.get(str(r.user_id)) ?? "family";
    const set = readerRolesByMessage.get(mid) ?? new Set<string>();
    set.add(role);
    readerRolesByMessage.set(mid, set);
  }

  return Promise.all(
    list.map((row) => rowToMessage(row, roleById, nameById, readerRolesByMessage.get(str(row.id)) ?? new Set())),
  );
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
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: args.conversationId,
      sender_id: args.senderId,
      body: args.body,
      attachments: encodeAttachments(args.kind, args.meta, args.attachments ?? []),
    })
    .select("*")
    .single();
  if (error || !row) throw new Error(error?.message || "Failed to send message.");

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", args.conversationId);

  return {
    id: str(row.id),
    conversationId: str(row.conversation_id),
    senderId: args.senderId,
    senderRole: args.senderRole,
    senderName: args.senderName,
    body: args.body,
    kind: args.kind,
    meta: args.meta ?? null,
    attachments: args.attachments ?? [],
    createdAt: str(row.created_at),
    readByFamily: args.senderRole === "family",
    readByCommunity: args.senderRole === "staff",
  };
}

export async function markRead(args: {
  conversationId: string;
  userId: string;
  role: MessageSenderRole;
}): Promise<void> {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("family_id")
    .eq("id", args.conversationId)
    .single();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender_id")
    .eq("conversation_id", args.conversationId);

  const { roleById } = await resolveSenderRoles(
    supabase,
    (rows ?? []).map((r) => str(r.sender_id)),
    str(conversation?.family_id),
  );

  const toMark = (rows ?? []).filter((r) => {
    const senderRole = roleById.get(str(r.sender_id));
    return senderRole !== args.role;
  });
  if (toMark.length === 0) return;

  await supabase
    .from("message_reads")
    .upsert(
      toMark.map((r) => ({ message_id: str(r.id), user_id: args.userId })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
}
