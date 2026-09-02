import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailResult = { messageId: string; driver: "smtp" | "resend" };

async function sendViaSmtp(input: SendEmailInput): Promise<MailResult> {
  const env = getEnv();
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { messageId: info.messageId, driver: "smtp" };
}

async function sendViaResend(input: SendEmailInput): Promise<MailResult> {
  const env = getEnv();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { id?: string };
  return { messageId: data.id ?? "resend", driver: "resend" };
}

export const mail = {
  async send(input: SendEmailInput): Promise<MailResult> {
    const env = getEnv();
    if (env.EMAIL_DRIVER === "resend") return sendViaResend(input);
    return sendViaSmtp(input);
  },
};
