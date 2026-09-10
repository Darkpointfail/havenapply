/**
 * A transactional email to send. Plain text is required so the message is
 * always readable even if a client blocks HTML; `html` is optional.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSendResult =
  | { ok: true; provider: string; id?: string }
  | { ok: false; provider: string; error: string };

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
