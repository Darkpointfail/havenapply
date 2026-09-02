"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { ApplicationStatus } from "@prisma/client";
import { CSRF_FIELD } from "@/lib/csrf-constants";

function newIdempotencyKey() {
  return crypto.randomUUID();
}

function SubmitButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      data-testid="staff-transition-submit"
      className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export type StaffTransitionLabels = {
  chooseAction: string;
  confirm: string;
  cancel: string;
  submit: string;
  submitting: string;
  internalNote: string;
  familyMessage: string;
  requestedDocuments: string;
  requestedDocumentsHelp: string;
  waitlistPosition: string;
  waitlistPositionHelp: string;
  nextSteps: string;
  reopenReason: string;
  confirmPrompt: string;
  readOnly: string;
  statusLabels: Record<string, string>;
};

type Props = {
  applicationId: string;
  currentStatus: ApplicationStatus;
  version: number;
  csrfToken: string;
  allowedTargets: ApplicationStatus[];
  canReopen: boolean;
  canMutate: boolean;
  action: (formData: FormData) => void | Promise<void>;
  labels: StaffTransitionLabels;
};

export function StaffStatusTransitionForm({
  currentStatus,
  version,
  csrfToken,
  allowedTargets,
  canReopen,
  canMutate,
  action,
  labels,
}: Props) {
  const [toStatus, setToStatus] = useState<ApplicationStatus | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  if (!canMutate) {
    return (
      <p className="text-sm opacity-70" data-testid="staff-readonly-banner">
        {labels.readOnly}
      </p>
    );
  }

  const reopenTargets: ApplicationStatus[] =
    canReopen && (currentStatus === "ACCEPTED" || currentStatus === "REJECTED")
      ? ["UNDER_REVIEW"]
      : [];
  const targets = [...allowedTargets, ...reopenTargets];

  if (targets.length === 0) {
    return null;
  }

  const isReopen =
    (currentStatus === "ACCEPTED" || currentStatus === "REJECTED") &&
    toStatus === "UNDER_REVIEW";

  return (
    <form
      action={action}
      className="space-y-4"
      data-testid="staff-transition-form"
      onSubmit={(e) => {
        if (!toStatus || !confirmed) {
          e.preventDefault();
          return;
        }
        const ok = window.confirm(
          `${labels.confirmPrompt} ${labels.statusLabels[toStatus] || toStatus}`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="expectedStatus" value={currentStatus} />
      <input type="hidden" name="expectedVersion" value={String(version)} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="toStatus" value={toStatus} />

      <div>
        <label className="block text-sm font-medium" htmlFor="toStatusSelect">
          {labels.chooseAction}
        </label>
        <select
          id="toStatusSelect"
          data-testid="staff-to-status"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          value={toStatus}
          onChange={(e) => {
            setToStatus(e.target.value as ApplicationStatus | "");
            setConfirmed(false);
            setIdempotencyKey(newIdempotencyKey());
          }}
          required
        >
          <option value="">—</option>
          {targets.map((s) => (
            <option key={s} value={s}>
              {labels.statusLabels[s] || s}
              {reopenTargets.includes(s) ? " ★" : ""}
            </option>
          ))}
        </select>
      </div>

      {toStatus === "NEEDS_DOCUMENTS" ? (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="familyMessage">
              {labels.familyMessage} *
            </label>
            <textarea
              id="familyMessage"
              name="familyMessage"
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-family-message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="requestedDocuments">
              {labels.requestedDocuments} *
            </label>
            <p className="mt-0.5 text-xs opacity-60">{labels.requestedDocumentsHelp}</p>
            <textarea
              id="requestedDocuments"
              name="requestedDocuments"
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-requested-documents"
              placeholder={"Avis d'imposition\nPièce d'identité"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="internalNote">
              {labels.internalNote}
            </label>
            <textarea
              id="internalNote"
              name="internalNote"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      {toStatus === "WAITLISTED" ? (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="internalNote">
              {labels.internalNote}
            </label>
            <textarea
              id="internalNote"
              name="internalNote"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="familyMessage">
              {labels.familyMessage}
            </label>
            <textarea
              id="familyMessage"
              name="familyMessage"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="waitlistPosition">
              {labels.waitlistPosition}
            </label>
            <p className="mt-0.5 text-xs opacity-60">{labels.waitlistPositionHelp}</p>
            <input
              id="waitlistPosition"
              name="waitlistPosition"
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-waitlist-position"
            />
          </div>
        </>
      ) : null}

      {toStatus === "REJECTED" ? (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="internalNote">
              {labels.internalNote} *
            </label>
            <textarea
              id="internalNote"
              name="internalNote"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-internal-note"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="familyMessage">
              {labels.familyMessage} *
            </label>
            <textarea
              id="familyMessage"
              name="familyMessage"
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-family-message"
            />
          </div>
        </>
      ) : null}

      {toStatus === "ACCEPTED" ? (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="familyMessage">
              {labels.familyMessage}
            </label>
            <textarea
              id="familyMessage"
              name="familyMessage"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-family-message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="nextSteps">
              {labels.nextSteps}
            </label>
            <textarea
              id="nextSteps"
              name="nextSteps"
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              data-testid="staff-next-steps"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="internalNote">
              {labels.internalNote}
            </label>
            <textarea
              id="internalNote"
              name="internalNote"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      {toStatus === "UNDER_REVIEW" && !isReopen ? (
        <div>
          <label className="block text-sm font-medium" htmlFor="internalNote">
            {labels.internalNote}
          </label>
          <textarea
            id="internalNote"
            name="internalNote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {isReopen ? (
        <div>
          <label className="block text-sm font-medium" htmlFor="reopenReason">
            {labels.reopenReason} *
          </label>
          <textarea
            id="reopenReason"
            name="reopenReason"
            required
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-reopen-reason"
          />
        </div>
      ) : null}

      {toStatus ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            data-testid="staff-confirm-transition"
            className="mt-1"
          />
          <span>
            {labels.confirm}: {labels.statusLabels[toStatus] || toStatus}
          </span>
        </label>
      ) : null}

      <SubmitButton
        label={labels.submit}
        pendingLabel={labels.submitting}
        disabled={!toStatus || !confirmed}
      />
    </form>
  );
}
