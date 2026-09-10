import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/**
 * Default provider: no real transport is configured yet. Logs the email to
 * the server console instead of sending it, so nothing silently disappears
 * during local development or before a real provider is wired up (set
 * RESEND_API_KEY + EMAIL_FROM to switch to the real one — see mailer.ts).
 * Never rely on this in front of real users; it delivers nothing.
 */
export const consoleProvider: EmailProvider = {
  name: "console",
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log(
      `[email:console] no transport configured — would send to ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  ${message.text.replace(/\n/g, "\n  ")}`,
    );
    return { ok: true, provider: "console" };
  },
};
