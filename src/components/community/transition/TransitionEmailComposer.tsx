"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { EmailTemplateId } from "@/lib/community-transition";
import { emailTemplates } from "@/lib/community-transition";
import { useT } from "@/lib/i18n/locale";

export function TransitionEmailComposer({
  to,
  templateId,
  onCancel,
  onSend,
}: {
  to: string;
  templateId: EmailTemplateId;
  onCancel: () => void;
  onSend: (payload: { to: string; subject: string; body: string; template: string }) => void;
}) {
  const t = useT();
  const templates = emailTemplates();
  const base = templates[templateId];
  const [recipient, setRecipient] = useState(to);
  const [subject, setSubject] = useState<string>(base.subject);
  const [body, setBody] = useState<string>(base.body);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-lg">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Review email</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {t("Sent from HavenApply and logged on this dossier’s timeline.")}
        </p>

        <label className="mt-5 block text-sm">
          To
          <input
            className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          Subject
          <input
            className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          Message
          <textarea
            rows={6}
            className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="mt-4 rounded-xl border border-line bg-bg-soft/60 px-3 py-3 text-xs text-ink-muted">
          <p className="font-medium text-ink">Preview</p>
          <p className="mt-1">
            <span className="text-ink-faint">To:</span> {recipient || "—"}
          </p>
          <p>
            <span className="text-ink-faint">Subject:</span> {subject}
          </p>
          <p className="mt-2 whitespace-pre-line text-ink-secondary">{body}</p>
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!recipient.trim() || !subject.trim()}
            onClick={() =>
              onSend({
                to: recipient.trim(),
                subject: subject.trim(),
                body: body.trim(),
                template: templateId,
              })
            }
          >
            {t("Send email")}
          </Button>
        </div>
      </div>
    </div>
  );
}
