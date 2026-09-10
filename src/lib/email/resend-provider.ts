import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/**
 * Sends through Resend (https://resend.com) using its plain HTTPS API — no
 * SDK dependency needed. Requires two env vars:
 *   RESEND_API_KEY — from the Resend dashboard.
 *   EMAIL_FROM     — e.g. "HavenApply <admissions@havenapply.com>"; the
 *                    domain must be verified in that same Resend account.
 * Selected automatically by mailer.ts whenever both are set.
 */
export const resendProvider: EmailProvider = {
  name: "resend",
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return { ok: false, provider: "resend", error: "RESEND_API_KEY or EMAIL_FROM missing." };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: "resend",
          error: `Resend responded ${res.status}: ${body.slice(0, 300)}`,
        };
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, provider: "resend", id: data.id };
    } catch (err) {
      return {
        ok: false,
        provider: "resend",
        error: err instanceof Error ? err.message : "Unknown error sending email.",
      };
    }
  },
};
