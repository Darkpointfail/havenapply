import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireFamilyActor, requireStaffActor } from "@/lib/admissions/authz";
import { requireCsrf } from "@/lib/security/guards";
import { getDetail } from "@/lib/admissions/repository";
import type { AdmissionApplicationRecord } from "@/lib/admissions/types";
import { getMessages, getOrCreateConversation, sendMessage } from "@/lib/messaging-server/repository";
import { isMessageKind, type MessageSenderRole } from "@/lib/messaging-server/types";
import { readJson } from "@/lib/admissions/validation";
import { applicationNewMessageEmail, sendEmail } from "@/lib/email/mailer";

const MAX_BODY = 4000;
const MAX_META = 300;
const MAX_ATTACHMENTS = 20;

type ResolvedActor = {
  role: MessageSenderRole;
  userId: string;
  displayName: string;
  application: AdmissionApplicationRecord;
};

type ActorFailure = { ok: false; status: number; error: string };

/**
 * Resolve the caller against the target application, family or staff.
 * Mirrors /api/admissions/[id]/route.ts: 401 when not signed in, 404 when
 * signed in but not the owner/staff of this application (never confirm
 * existence to an unauthorized caller).
 */
async function resolveActor(applicationId: string): Promise<ResolvedActor | ActorFailure> {
  const family = await requireFamilyActor();
  if (family.ok) {
    const detail = await getDetail({ applicationId, familyUserId: family.actor.userId });
    if (!detail) return { ok: false, status: 404, error: "Application not found." };
    return {
      role: "family",
      userId: family.actor.userId,
      displayName: family.actor.displayName,
      application: detail.application,
    };
  }

  const staff = await requireStaffActor();
  if (staff.ok) {
    const detail = await getDetail({ applicationId, siteIds: staff.actor.siteIds });
    if (!detail) return { ok: false, status: 404, error: "Application not found." };
    return {
      role: "staff",
      userId: staff.actor.userId,
      displayName: staff.actor.displayName,
      application: detail.application,
    };
  }

  return { ok: false, status: 401, error: "Session expired. Please sign in again." };
}

function isActorFailure(value: ResolvedActor | ActorFailure): value is ActorFailure {
  return (value as ActorFailure).ok === false;
}

export async function GET(_request: Request, ctx: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await ctx.params;
  const actor = await resolveActor(applicationId);
  if (isActorFailure(actor)) return jsonError(actor.error, actor.status);

  const conversation = await getOrCreateConversation({
    applicationId,
    familyUserId: actor.application.familyUserId,
    siteId: actor.application.siteId,
    siteName: actor.application.siteName,
  });
  const messages = await getMessages(conversation.id, conversation.familyUserId);

  return jsonOk({ conversation, messages, viewerRole: actor.role });
}

export async function POST(request: Request, ctx: { params: Promise<{ applicationId: string }> }) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const { applicationId } = await ctx.params;
  const actor = await resolveActor(applicationId);
  if (isActorFailure(actor)) return jsonError(actor.error, actor.status);

  const body = (await readJson(request)) as {
    text?: unknown;
    kind?: unknown;
    meta?: unknown;
    attachments?: unknown;
  } | null;

  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_BODY) : "";
  if (!text) return jsonError("Message cannot be empty.", 400);

  const kind = isMessageKind(body?.kind)
    ? body.kind
    : Array.isArray(body?.attachments) && body.attachments.length
      ? "attachment"
      : "text";
  const meta = typeof body?.meta === "string" ? body.meta.trim().slice(0, MAX_META) : null;
  const attachments = Array.isArray(body?.attachments)
    ? (body.attachments as Record<string, unknown>[]).slice(0, MAX_ATTACHMENTS).map((a) => ({
        name: typeof a?.name === "string" ? a.name.slice(0, 300) : "",
        size: typeof a?.size === "string" ? a.size.slice(0, 40) : "",
      })).filter((a) => a.name)
    : [];

  const conversation = await getOrCreateConversation({
    applicationId,
    familyUserId: actor.application.familyUserId,
    siteId: actor.application.siteId,
    siteName: actor.application.siteName,
  });

  const message = await sendMessage({
    conversationId: conversation.id,
    senderId: actor.userId,
    senderRole: actor.role,
    senderName: actor.displayName,
    body: text,
    kind,
    meta,
    attachments,
  });

  // Only notify the family (staff → family); a family's own message doesn't
  // need to email itself. Best-effort — sendEmail() never throws, so a mail
  // provider hiccup can't fail the send.
  if (actor.role === "staff" && actor.application.familyEmail) {
    await sendEmail(
      applicationNewMessageEmail(actor.application.familyEmail, {
        familyName: actor.application.familyContact.name || actor.application.senior.name,
        seniorName: actor.application.senior.name,
        residenceName: actor.application.siteName,
        messagePreview: text,
      }),
    );
  }

  return jsonOk({ conversation, message });
}
