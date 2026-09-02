import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mail } from "@/lib/mail";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

export type OutboxPayload = {
  toUserId?: string;
  toEmail?: string;
  subject: string;
  text: string;
  applicationId: string;
  publicRef: string;
  locale?: string;
};

/**
 * Enqueue a notification in the same DB transaction as the domain write.
 * Payload must never include document contents, medical data, or secrets.
 */
export async function enqueueOutbox(
  tx: Prisma.TransactionClient,
  input: {
    type: string;
    aggregateType: string;
    aggregateId: string;
    idempotencyKey: string;
    payload: OutboxPayload;
  },
) {
  const existing = await tx.outboxEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  return tx.outboxEvent.create({
    data: {
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });
}

/** Process pending outbox rows (call from request path after commit or a worker). */
export async function dispatchOutbox(limit = 20) {
  const pending = await prisma.outboxEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  for (const event of pending) {
    try {
      const payload = event.payload as OutboxPayload;
      let to = payload.toEmail;
      if (!to && payload.toUserId) {
        const user = await prisma.user.findUnique({
          where: { id: payload.toUserId },
          select: { email: true, notificationPreference: true },
        });
        if (
          !user ||
          user.notificationPreference?.emailEnabled === false ||
          user.notificationPreference?.applicationUpdates === false
        ) {
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: "SENT", processedAt: new Date() },
          });
          continue;
        }
        to = user.email;
      }
      if (!to) {
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: "FAILED", lastError: "NO_RECIPIENT", attempts: { increment: 1 } },
        });
        continue;
      }

      await mail.send({
        to,
        subject: payload.subject,
        text: payload.text,
      });

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "SENT", processedAt: new Date() },
      });

      await writeAudit({
        action: "notification.sent",
        entityType: "OutboxEvent",
        entityId: event.id,
        metadata: {
          type: event.type,
          aggregateId: event.aggregateId,
          // Never log email body or PII beyond aggregate id / type.
        },
      });
      sent += 1;
    } catch (error) {
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message.slice(0, 200) : "SEND_FAILED",
        },
      });
    }
  }
  return { processed: pending.length, sent };
}

export function applicationStatusEmail(input: {
  publicRef: string;
  toStatus: string;
  locale: string;
  familyMessage?: string | null;
  applicationId?: string;
}): { subject: string; text: string } {
  const env = getEnv();
  const link = input.applicationId
    ? `${env.APP_URL}/${input.locale}/family/applications/${input.applicationId}`
    : `${env.APP_URL}/${input.locale}/family/dashboard`;
  const fr = input.locale === "fr";
  const subject = fr
    ? `HavenApply — mise à jour de la candidature ${input.publicRef}`
    : `HavenApply — application update ${input.publicRef}`;
  const lines = [
    fr
      ? `Le statut de votre candidature ${input.publicRef} a été mis à jour (${input.toStatus}).`
      : `Your application ${input.publicRef} was updated (${input.toStatus}).`,
  ];
  if (input.familyMessage) {
    lines.push(input.familyMessage.slice(0, 500));
  }
  lines.push(fr ? `Ouvrir : ${link}` : `Open: ${link}`);
  lines.push(
    fr
      ? "Ce message ne contient aucun document ni donnée médicale."
      : "This message contains no documents or medical data.",
  );
  return { subject, text: lines.join("\n\n") };
}
