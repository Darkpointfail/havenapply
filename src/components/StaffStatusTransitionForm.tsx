"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ApplicationStatus } from "@prisma/client";
import { CSRF_FIELD } from "@/lib/csrf-constants";

function newIdempotencyKey() {
  return crypto.randomUUID();
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
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
  const formRef = useRef<HTMLFormElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const idempotencyRef = useRef<HTMLInputElement>(null);
  const selectedLabelRef = useRef<HTMLSpanElement>(null);

  const reopenTargets: ApplicationStatus[] =
    canReopen && (currentStatus === "ACCEPTED" || currentStatus === "REJECTED")
      ? ["UNDER_REVIEW"]
      : [];
  const targets = [...allowedTargets, ...reopenTargets];
  const canReopenFromHere =
    canReopen && (currentStatus === "ACCEPTED" || currentStatus === "REJECTED");

  useEffect(() => {
    const el = selectRef.current;
    const form = formRef.current;
    if (!el || !form) return;

    const sync = () => {
      const value = el.value || "";
      if (selectedLabelRef.current) {
        selectedLabelRef.current.textContent = value
          ? `: ${labels.statusLabels[value] || value}`
          : "";
      }
      if (confirmRef.current) confirmRef.current.checked = false;
      if (idempotencyRef.current) idempotencyRef.current.value = newIdempotencyKey();

      form.querySelectorAll<HTMLElement>("[data-when-status]").forEach((panel) => {
        const when = panel.getAttribute("data-when-status") || "";
        const match = when.split("|").includes(value);
        panel.hidden = !match;
        panel
          .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
          .forEach((field) => {
            field.disabled = !match;
            if (field.dataset.requiredWhen === "true") {
              field.required = match;
            }
          });
      });
    };

    el.addEventListener("change", sync);
    el.addEventListener("input", sync);
    sync();
    return () => {
      el.removeEventListener("change", sync);
      el.removeEventListener("input", sync);
    };
    // Mount once; labels looked up from latest props via closure on remount after navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canMutate) {
    return (
      <p className="text-sm opacity-70" data-testid="staff-readonly-banner">
        {labels.readOnly}
      </p>
    );
  }

  if (targets.length === 0) {
    return null;
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      data-testid="staff-transition-form"
      onSubmit={(e) => {
        const selected = selectRef.current?.value || "";
        if (!selected || !confirmRef.current?.checked) {
          e.preventDefault();
          return;
        }
        const ok = window.confirm(
          `${labels.confirmPrompt} ${labels.statusLabels[selected] || selected}`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="expectedStatus" value={currentStatus} />
      <input type="hidden" name="expectedVersion" value={String(version)} />
      <input
        ref={idempotencyRef}
        type="hidden"
        name="idempotencyKey"
        defaultValue=""
      />

      <div>
        <label className="block text-sm font-medium" htmlFor="toStatusSelect">
          {labels.chooseAction}
        </label>
        <select
          ref={selectRef}
          id="toStatusSelect"
          name="toStatus"
          data-testid="staff-to-status"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          defaultValue=""
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

      <div data-when-status="NEEDS_DOCUMENTS" className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="familyMessageNeeds">
            {labels.familyMessage} *
          </label>
          <textarea
            id="familyMessageNeeds"
            name="familyMessage"
            data-required-when="true"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-family-message-needs"
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
            data-required-when="true"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-requested-documents"
            placeholder={"Avis d'imposition\nPièce d'identité"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="internalNoteNeeds">
            {labels.internalNote}
          </label>
          <textarea
            id="internalNoteNeeds"
            name="internalNote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div data-when-status="WAITLISTED" className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="internalNoteWait">
            {labels.internalNote}
          </label>
          <textarea
            id="internalNoteWait"
            name="internalNote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="familyMessageWait">
            {labels.familyMessage}
          </label>
          <textarea
            id="familyMessageWait"
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
      </div>

      <div data-when-status="REJECTED" className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="internalNoteReject">
            {labels.internalNote} *
          </label>
          <textarea
            id="internalNoteReject"
            name="internalNote"
            data-required-when="true"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-internal-note"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="familyMessageReject">
            {labels.familyMessage} *
          </label>
          <textarea
            id="familyMessageReject"
            name="familyMessage"
            data-required-when="true"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-family-message-reject"
          />
        </div>
      </div>

      <div data-when-status="ACCEPTED" className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="familyMessageAccept">
            {labels.familyMessage}
          </label>
          <textarea
            id="familyMessageAccept"
            name="familyMessage"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-family-message-accept"
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
          <label className="block text-sm font-medium" htmlFor="internalNoteAccept">
            {labels.internalNote}
          </label>
          <textarea
            id="internalNoteAccept"
            name="internalNote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div
        data-when-status={canReopenFromHere ? "UNDER_REVIEW" : "__never__"}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium" htmlFor="reopenReason">
            {labels.reopenReason} *
          </label>
          <textarea
            id="reopenReason"
            name="reopenReason"
            data-required-when="true"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            data-testid="staff-reopen-reason"
          />
        </div>
      </div>

      <div
        data-when-status={canReopenFromHere ? "__never__" : "UNDER_REVIEW"}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium" htmlFor="internalNoteReview">
            {labels.internalNote}
          </label>
          <textarea
            id="internalNoteReview"
            name="internalNote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          ref={confirmRef}
          type="checkbox"
          data-testid="staff-confirm-transition"
          className="mt-1"
        />
        <span>
          {labels.confirm}
          <span ref={selectedLabelRef} />
        </span>
      </label>

      <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
    </form>
  );
}
