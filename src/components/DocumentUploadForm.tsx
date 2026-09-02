"use client";

import { useFormStatus } from "react-dom";
import { CSRF_FIELD } from "@/lib/csrf-constants";

function SubmitButton({ label, uploading }: { label: string; uploading: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="document-upload-submit"
      className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? uploading : label}
    </button>
  );
}

type Props = {
  applicationId: string;
  csrfToken: string;
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    upload: string;
    uploading: string;
    error: string | null;
    allowedTypes: string;
  };
};

/**
 * Server-action form: file never lands on durable app disk beyond the request buffer.
 * Progress is request-level (pending) — object storage happens in the action.
 */
export function DocumentUploadForm({ applicationId, csrfToken, action, labels }: Props) {
  return (
    <form action={action} className="space-y-3" data-testid="document-upload-form">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-xs opacity-60">{labels.allowedTypes}</p>
      <input
        type="file"
        name="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        required
        className="block w-full text-sm"
        data-testid="document-file-input"
      />
      <SubmitButton label={labels.upload} uploading={labels.uploading} />
      {labels.error ? (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="document-upload-error"
        >
          {labels.error}
        </p>
      ) : null}
    </form>
  );
}
