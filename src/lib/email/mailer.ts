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
