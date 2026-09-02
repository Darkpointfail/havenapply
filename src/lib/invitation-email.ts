import type { Prisma } from "@prisma/client";
import type { OutboxPayload } from "@/lib/outbox";
import { getEnv } from "@/lib/env";
import { invitationAbsoluteUrl, type InviteKind } from "@/lib/invitation-common";

/**
 * Security / transactional invitation emails.
 * Preferences do NOT apply — these messages are required to complete access grants.
 * Never include medical data, documents, or secrets beyond the one-time link.
 */
export function invitationEmail(input: {
  kind: InviteKind;
  locale: string;
  rawToken: string;
  orgOrFamilyLabel: string;
  roleLabel: string;
}): { subject: string; text: string } {
  const fr = input.locale !== "en";
  const link = invitationAbsoluteUrl(input.kind, input.locale, input.rawToken);
  const env = getEnv();

  if (input.kind === "caregiver") {
    const subject = fr
      ? "HavenApply — invitation à rejoindre un foyer"
      : "HavenApply — invitation to join a family profile";
    const text = [
      fr
        ? `Vous êtes invité(e) à rejoindre le foyer « ${input.orgOrFamilyLabel} » en tant que ${input.roleLabel}.`
        : `You are invited to join the family profile “${input.orgOrFamilyLabel}” as ${input.roleLabel}.`,
      fr ? `Accepter (lien à usage unique) : ${link}` : `Accept (one-time link): ${link}`,
      fr
        ? `Ce message ne contient aucun document ni donnée médicale. Lien valable selon la configuration serveur (${env.INVITATION_TTL_HOURS} h).`
        : `This message contains no documents or medical data. Link validity follows server config (${env.INVITATION_TTL_HOURS} h).`,
    ].join("\n\n");
    return { subject, text };
  }

  const subject = fr
    ? "HavenApply — invitation équipe résidence"
    : "HavenApply — residence staff invitation";
  const text = [
    fr
      ? `Vous êtes invité(e) à rejoindre « ${input.orgOrFamilyLabel} » en tant que ${input.roleLabel}.`
      : `You are invited to join “${input.orgOrFamilyLabel}” as ${input.roleLabel}.`,
    fr ? `Accepter (lien à usage unique) : ${link}` : `Accept (one-time link): ${link}`,
    fr
      ? `Ce message ne contient aucun document ni donnée médicale. Lien valable selon la configuration serveur (${env.INVITATION_TTL_HOURS} h).`
      : `This message contains no documents or medical data. Link validity follows server config (${env.INVITATION_TTL_HOURS} h).`,
  ].join("\n\n");
  return { subject, text };
}

export function invitationOutboxPayload(input: {
  toEmail: string;
  subject: string;
  text: string;
  invitationId: string;
  kind: InviteKind;
  locale: string;
}): OutboxPayload {
  return {
    toEmail: input.toEmail,
    subject: input.subject,
    text: input.text,
    applicationId: input.invitationId,
    publicRef: input.kind,
    locale: input.locale,
  };
}

export type { Prisma };
