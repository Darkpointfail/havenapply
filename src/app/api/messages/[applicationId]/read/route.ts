import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor, requireStaffActor } from "@/lib/admissions/authz";
import { requireCsrf } from "@/lib/security/guards";
import { getDetail } from "@/lib/admissions/repository";
import { getConversationByApplication, markRead } from "@/lib/messaging-server/repository";
import type { MessageSenderRole } from "@/lib/messaging-server/types";

export async function POST(request: Request, ctx: { params: Promise<{ applicationId: string }> }) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const { applicationId } = await ctx.params;

  const family = await requireFamilyActor();
  let role: MessageSenderRole | null = null;
  let userId = "";

  if (family.ok) {
    const detail = await getDetail({ applicationId, familyUserId: family.actor.userId });
    if (!detail) return jsonError("Application not found.", 404);
    role = "family";
    userId = family.actor.userId;
  } else {
    const staff = await requireStaffActor();
    if (!staff.ok) return jsonError(staff.error, staff.status);
    const detail = await getDetail({ applicationId, siteIds: staff.actor.siteIds });
    if (!detail) return jsonError("Application not found.", 404);
    role = "staff";
    userId = staff.actor.userId;
  }

  const conversation = await getConversationByApplication(applicationId);
  if (conversation) {
    await markRead({ conversationId: conversation.id, userId, role });
  }

  return jsonOk({});
}
