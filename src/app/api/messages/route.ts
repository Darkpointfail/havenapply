import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor, requireStaffActor } from "@/lib/admissions/authz";
import {
  getMessages,
  listConversationsForFamily,
  listConversationsForSites,
} from "@/lib/messaging-server/repository";
import type { MessageSenderRole } from "@/lib/messaging-server/types";

/** Inbox: every conversation (with its messages) visible to the caller. */
export async function GET() {
  const family = await requireFamilyActor();

  let conversations;
  let viewerRole: MessageSenderRole;

  if (family.ok) {
    conversations = await listConversationsForFamily(family.actor.userId);
    viewerRole = "family";
  } else {
    const staff = await requireStaffActor();
    if (!staff.ok) return jsonError(staff.error, staff.status);
    conversations = await listConversationsForSites(staff.actor.siteIds);
    viewerRole = "staff";
  }

  const threads = await Promise.all(
    conversations.map(async (conversation) => ({
      conversation,
      messages: await getMessages(conversation.id, conversation.familyUserId),
    })),
  );

  return jsonOk({ threads, viewerRole });
}
