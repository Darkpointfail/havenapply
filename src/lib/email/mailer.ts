import { consoleProvider } from "./console-provider";
import { resendProvider } from "./resend-provider";
import type { EmailMessage, EmailSendResult } from "./types";
import { recordAuditEvent } from "@/lib/security/identity-store";

/**
 * True once a real transport is configured (RESEND_API_KEY + EMAIL_FROM in
 * the environment). Until then every "sent" email is only logged — see
 * console-provider.ts. Mirrors the isSupabaseBackend() pattern: the backend
 * is chosen by which env vars are present, not by a separate feature flag.
 */
export function hasEmailTransport(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function provider() {
  return hasEmailTransport() ? resendProvider : consoleProvider;
}

/** Base URL for links inside emails (verification, reset, invitations, ...). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const result = await provider().send(message);
  await recordAuditEvent({
    event: "email.send",
    outcome: result.ok ? "success" : "failure",
    subject: message.to,
    metadata: {
      provider: result.provider,
      subjectLine: message.subject,
      ...(result.ok ? {} : { error: result.error }),
    },
  });
  return result;
}

// --- Templates ---------------------------------------------------------
// Bilingual (FR first, per HavenApply's Quebec-first positioning) until
// credentials carry a language preference to pick from.

export function verificationEmail(to: string, token: string): EmailMessage {
  const link = `${siteUrl()}/verify?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Confirmez votre courriel — HavenApply",
    text: [
      "Bonjour,",
      "",
      "Confirmez votre adresse courriel pour activer votre compte HavenApply :",
      link,
      "",
      "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.",
      "",
      "—",
      "",
      "Hello,",
      "",
      "Confirm your email address to activate your HavenApply account:",
      link,
      "",
      "This link expires in 24 hours. If you didn't request this, you can ignore this email.",
    ].join("\n"),
  };
}

export function passwordResetEmail(to: string, token: string): EmailMessage {
  const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Réinitialisation de mot de passe — HavenApply",
    text: [
      "Bonjour,",
      "",
      "Une réinitialisation de mot de passe a été demandée pour ce compte. Si c'est vous, cliquez ici :",
      link,
      "",
      "Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel — votre mot de passe reste inchangé.",
      "",
      "—",
      "",
      "Hello,",
      "",
      "A password reset was requested for this account. If that was you, click here:",
      link,
      "",
      "This link expires in 30 minutes. If you didn't request this, you can ignore this email — your password stays unchanged.",
    ].join("\n"),
  };
}

/** Fixed internal recipient for unclaimed-residence submission alerts. */
export const INTERNAL_NOTIFICATION_EMAIL = "hello@havenapply.com";

function applicationsLink(): string {
  return `${siteUrl()}/family/dashboard?view=demandes`;
}

export function applicationAcceptedEmail(
  to: string,
  args: { familyName: string; seniorName: string; residenceName: string },
): EmailMessage {
  const link = applicationsLink();
  return {
    to,
    subject: `Bonne nouvelle — ${args.residenceName} a accepté la demande de ${args.seniorName}`,
    text: [
      `Bonjour ${args.familyName},`,
      "",
      `${args.residenceName} a accepté la demande d'admission de ${args.seniorName}.`,
      `Consultez les prochaines étapes dans votre espace famille :`,
      link,
      "",
      "—",
      "",
      `Hello ${args.familyName},`,
      "",
      `${args.residenceName} has accepted ${args.seniorName}'s application.`,
      "See the next steps in your family space:",
      link,
    ].join("\n"),
  };
}

export function applicationDeclinedEmail(
  to: string,
  args: { familyName: string; seniorName: string; residenceName: string },
): EmailMessage {
  const link = applicationsLink();
  return {
    to,
    subject: `Mise à jour de la demande de ${args.seniorName} auprès de ${args.residenceName}`,
    text: [
      `Bonjour ${args.familyName},`,
      "",
      `${args.residenceName} n'est pas en mesure de donner suite à la demande d'admission de ${args.seniorName} pour le moment.`,
      "Vous pouvez consulter le détail et envoyer une demande à d'autres résidences depuis votre espace famille :",
      link,
      "",
      "—",
      "",
      `Hello ${args.familyName},`,
      "",
      `${args.residenceName} is not able to move forward with ${args.seniorName}'s application at this time.`,
      "You can see the details and apply to other residences from your family space:",
      link,
    ].join("\n"),
  };
}

export function applicationStatusChangedEmail(
  to: string,
  args: { familyName: string; seniorName: string; residenceName: string; newStatus: string },
): EmailMessage {
  const link = applicationsLink();
  const status = args.newStatus.replace(/_/g, " ");
  return {
    to,
    subject: `Mise à jour de la demande de ${args.seniorName} — ${args.residenceName}`,
    text: [
      `Bonjour ${args.familyName},`,
      "",
      `Le statut de la demande de ${args.seniorName} auprès de ${args.residenceName} a changé : ${status}.`,
      "Consultez le détail dans votre espace famille :",
      link,
      "",
      "—",
      "",
      `Hello ${args.familyName},`,
      "",
      `The status of ${args.seniorName}'s application with ${args.residenceName} changed: ${status}.`,
      "See the details in your family space:",
      link,
    ].join("\n"),
  };
}

export function applicationNewMessageEmail(
  to: string,
  args: {
    familyName: string;
    seniorName: string;
    residenceName: string;
    messagePreview: string;
  },
): EmailMessage {
  const link = applicationsLink();
  const preview = args.messagePreview.trim().slice(0, 280);
  return {
    to,
    subject: `Nouveau message de ${args.residenceName} au sujet de ${args.seniorName}`,
    text: [
      `Bonjour ${args.familyName},`,
      "",
      `${args.residenceName} vous a envoyé un nouveau message au sujet de la demande de ${args.seniorName} :`,
      "",
      `« ${preview}${args.messagePreview.trim().length > 280 ? "…" : ""} »`,
      "",
      "Répondez directement depuis votre espace famille :",
      link,
      "",
      "—",
      "",
      `Hello ${args.familyName},`,
      "",
      `${args.residenceName} sent you a new message about ${args.seniorName}'s application:`,
      "",
      `"${preview}${args.messagePreview.trim().length > 280 ? "…" : ""}"`,
      "",
      "Reply directly from your family space:",
      link,
    ].join("\n"),
  };
}

/**
 * Internal alert: a family submitted to a residence with no active staff
 * account yet (imported from an outside registry, e.g. the Québec RPA
 * registry — see scripts/import-rpa-communities.mjs). No secure link, no
 * email to the residence: just enough for a human at HavenApply to call the
 * residence directly.
 */
export function internalUnclaimedApplicationEmail(args: {
  residenceName: string;
  residenceAddress: string;
  familyName: string;
  familyPhone: string;
  familyEmail: string;
  seniorName: string;
  dossierSummary: string;
}): EmailMessage {
  return {
    to: INTERNAL_NOTIFICATION_EMAIL,
    subject: `Nouvelle demande — résidence non réclamée : ${args.residenceName}`,
    text: [
      `Une candidature a été soumise à ${args.residenceName}, qui n'a pas encore de compte HavenApply actif.`,
      "",
      `Résidence : ${args.residenceName}`,
      `Adresse : ${args.residenceAddress || "Non disponible"}`,
      "",
      `Famille : ${args.familyName}`,
      `Téléphone : ${args.familyPhone || "Non fourni"}`,
      `Courriel : ${args.familyEmail}`,
      `Aîné(e) concerné(e) : ${args.seniorName}`,
      "",
      `Résumé du dossier : ${args.dossierSummary || "Aucun résumé fourni."}`,
      "",
      "Action suggérée : appeler la résidence directement.",
    ].join("\n"),
  };
}
