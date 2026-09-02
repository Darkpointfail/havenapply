"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CSRF_FIELD } from "@/lib/csrf-constants";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="family-docs-response-submit"
      className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

type Props = {
  expectedVersion: number;
  csrfToken: string;
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    title: string;
    help: string;
    message: string;
    submit: string;
    submitting: string;
  };
};

export function FamilyDocumentsResponseForm({
  expectedVersion,
  csrfToken,
  action,
  labels,
}: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--fs-subtle,#eef3f0)]/40 p-4"
      data-testid="family-docs-response-form"
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="expectedStatus" value="NEEDS_DOCUMENTS" />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <h3 className="text-sm font-semibold">{labels.title}</h3>
      <p className="text-xs opacity-70">{labels.help}</p>
      <label className="block text-sm">
        <span className="opacity-70">{labels.message}</span>
        <textarea
          name="familyMessage"
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          data-testid="family-docs-response-message"
        />
      </label>
      <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
    </form>
  );
}
