"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FacilityDestinationPicker } from "@/components/community/transfer/FacilityDestinationPicker";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { formatPortalDate, formatPortalTime } from "@/lib/community-portal";
import {
  TRANSFER_REASONS,
  TRANSFER_URGENCY,
  transferPacketReady,
  transferReasonLabel,
  transferStatusMeta,
  type PatientTransfer,
  type TransferReasonId,
  type TransferUrgencyId,
} from "@/lib/patient-transfer";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function PatientTransferWorkspace({ transferId }: { transferId: string }) {
  const t = useT();
  const router = useRouter();
  const {
    ready,
    workspace,
    getPatientTransfer,
    updatePatientTransfer,
    sendPatientTransfer,
    can,
  } = useCommunityPortal();

  const transfer = getPatientTransfer(transferId);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readiness = useMemo(
    () => (transfer ? transferPacketReady(transfer) : { ok: false, missing: [] }),
    [transfer],
  );

  const canEdit = can("acceptDecline") && transfer && !["completed", "cancelled"].includes(transfer.status);

  function patch(
    updater: (prev: PatientTransfer) => PatientTransfer,
    timelineAction?: string,
    timelineDetail?: string,
  ) {
    setError(null);
    const res = updatePatientTransfer(transferId, updater, timelineAction, timelineDetail);
    if (!res.ok) setError(res.error || t("Could not save."));
  }

  function handleSend() {
    setError(null);
    setMessage(null);
    const res = sendPatientTransfer(transferId);
    if (!res.ok) {
      setError(res.error || t("Could not send transfer."));
      return;
    }
    setMessage(t("Transfer packet marked as sent to the receiving center."));
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Opening transfer…")}
      </div>
    );
  }

  if (!workspace || !transfer) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("Transfer not found")}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t("This transfer may have been removed, or your workspace is unavailable.")}
        </p>
        <Button href="/community/transition" size="sm" className="mt-5">
          {t("Back to Transition")}
        </Button>
      </div>
    );
  }

  const status = transferStatusMeta(transfer.status);
  const locked = !canEdit;

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[880px] space-y-8 px-5 py-8 md:px-8 md:py-12">
        <div>
          <Link
            href="/community/transition"
            className="text-sm font-medium text-brand hover:underline"
          >
            ← {t("All transitions")}
          </Link>
          <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink-muted">{t("Patient transfer")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                {transfer.residentName || t("Untitled transfer")}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {transfer.destination
                  ? `${t("To")} ${transfer.destination.name}`
                  : t("Select a receiving center below")}
                <span className="mx-1.5">·</span>
                {t("Updated")} {formatPortalDate(transfer.updatedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={status.tone}>{t(status.label)}</Badge>
                {transfer.urgency !== "routine" ? (
                  <Badge tone="warn">
                    {t(
                      TRANSFER_URGENCY.find((u) => u.id === transfer.urgency)?.label ||
                        transfer.urgency,
                    )}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!locked && transfer.status !== "sent" && transfer.status !== "acknowledged" ? (
                <Button
                  size="sm"
                  disabled={!readiness.ok}
                  onClick={handleSend}
                >
                  {t("Send to receiving center")}
                </Button>
              ) : null}
              {transfer.status === "sent" || transfer.status === "acknowledged" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    patch(
                      (prev) => ({ ...prev, status: "completed" }),
                      "Transfer marked completed",
                    )
                  }
                >
                  {t("Mark transfer completed")}
                </Button>
              ) : null}
            </div>
          </header>
        </div>

        {message ? (
          <p className="rounded-xl border border-success/30 bg-success-soft/50 px-4 py-3 text-sm text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {!readiness.ok ? (
          <p className="rounded-xl border border-warn/30 bg-warn-soft/40 px-4 py-3 text-sm text-warn">
            {t("Required before sending:")} {readiness.missing.map((m) => t(m)).join(", ")}
          </p>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">{t("Resident & reason")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Resident name *")}>
              <input
                className={inputClass}
                disabled={locked}
                value={transfer.residentName}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, residentName: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Date of birth")}>
              <input
                type="date"
                className={inputClass}
                disabled={locked}
                value={transfer.dateOfBirth}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Gender")}>
              <input
                className={inputClass}
                disabled={locked}
                value={transfer.gender}
                onChange={(e) => patch((prev) => ({ ...prev, gender: e.target.value }))}
              />
            </Field>
            <Field label={t("Preferred transfer date")}>
              <input
                type="date"
                className={inputClass}
                disabled={locked}
                value={transfer.preferredTransferDate}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, preferredTransferDate: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Transfer reason *")}>
              <select
                className={inputClass}
                disabled={locked}
                value={transfer.reasonId}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    reasonId: e.target.value as TransferReasonId | "",
                  }))
                }
              >
                <option value="">{t("Select a reason…")}</option>
                {TRANSFER_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(r.label)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Urgency")}>
              <select
                className={inputClass}
                disabled={locked}
                value={transfer.urgency}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    urgency: e.target.value as TransferUrgencyId,
                  }))
                }
              >
                {TRANSFER_URGENCY.map((u) => (
                  <option key={u.id} value={u.id}>
                    {t(u.label)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label={t("Reason details")}
            hint={t("Explain why the resident needs this transfer: shared with the receiving center.")}
          >
            <textarea
              className={cn(inputClass, "min-h-[88px]")}
              disabled={locked}
              value={transfer.reasonDetails}
              onChange={(e) =>
                patch((prev) => ({ ...prev, reasonDetails: e.target.value }))
              }
            />
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">
            {t("Receiving center *")}
          </h2>
          <p className="text-sm text-ink-muted">
            {t("Search the Medicare / Haven catalog or enter the destination facility manually.")}
          </p>
          {locked ? (
            transfer.destination ? (
              <div className="rounded-xl border border-line bg-bg px-4 py-3 text-sm">
                <p className="font-semibold text-ink">{transfer.destination.name}</p>
                <p className="mt-1 text-ink-muted">
                  {[
                    transfer.destination.address,
                    transfer.destination.city,
                    transfer.destination.state,
                    transfer.destination.zip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">{t("No destination selected.")}</p>
            )
          ) : (
            <FacilityDestinationPicker
              value={transfer.destination}
              excludeFacilityId={workspace.residenceId}
              onChange={(destination) =>
                patch(
                  (prev) => ({ ...prev, destination }),
                  destination
                    ? "Destination facility selected"
                    : "Destination cleared",
                  destination?.name,
                )
              }
            />
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("Receiving contact name")}>
              <input
                className={inputClass}
                disabled={locked}
                value={transfer.receivingContactName}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, receivingContactName: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Receiving contact phone")}>
              <input
                className={inputClass}
                disabled={locked}
                value={transfer.receivingContactPhone}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, receivingContactPhone: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Receiving contact email")}>
              <input
                type="email"
                className={inputClass}
                disabled={locked}
                value={transfer.receivingContactEmail}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, receivingContactEmail: e.target.value }))
                }
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">
            {t("Clinical packet for receiving center")}
          </h2>
          <div className="grid gap-4">
            <Field label={t("Diagnoses / problem list")}>
              <textarea
                className={cn(inputClass, "min-h-[72px]")}
                disabled={locked}
                value={transfer.diagnoses}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, diagnoses: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Current medications")}>
              <textarea
                className={cn(inputClass, "min-h-[72px]")}
                disabled={locked}
                value={transfer.medications}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, medications: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Allergies & reactions")}>
              <textarea
                className={cn(inputClass, "min-h-[56px]")}
                disabled={locked}
                value={transfer.allergies}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, allergies: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Mobility & ADLs")}>
                <textarea
                  className={cn(inputClass, "min-h-[72px]")}
                  disabled={locked}
                  value={transfer.mobilityAdls}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, mobilityAdls: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("Cognition & behavior")}>
                <textarea
                  className={cn(inputClass, "min-h-[72px]")}
                  disabled={locked}
                  value={transfer.cognitionBehavior}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, cognitionBehavior: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label={t("Special care needs")}>
              <textarea
                className={cn(inputClass, "min-h-[56px]")}
                disabled={locked}
                value={transfer.specialCareNeeds}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, specialCareNeeds: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Equipment & treatments")}>
              <textarea
                className={cn(inputClass, "min-h-[56px]")}
                disabled={locked}
                value={transfer.equipmentTreatments}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, equipmentTreatments: e.target.value }))
                }
              />
            </Field>
            <Field label={t("Insurance / payor")}>
              <input
                className={inputClass}
                disabled={locked}
                value={transfer.insurancePayor}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, insurancePayor: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Primary physician")}>
                <input
                  className={inputClass}
                  disabled={locked}
                  value={transfer.physicianName}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, physicianName: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("Physician phone")}>
                <input
                  className={inputClass}
                  disabled={locked}
                  value={transfer.physicianPhone}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, physicianPhone: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Emergency contact")}>
                <input
                  className={inputClass}
                  disabled={locked}
                  value={transfer.emergencyContactName}
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      emergencyContactName: e.target.value,
                    }))
                  }
                  placeholder={t("Name")}
                />
                <input
                  className={cn(inputClass, "mt-2")}
                  disabled={locked}
                  value={transfer.emergencyContactPhone}
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      emergencyContactPhone: e.target.value,
                    }))
                  }
                  placeholder={t("Phone")}
                />
              </Field>
              <Field label={t("Family contact")}>
                <input
                  className={inputClass}
                  disabled={locked}
                  value={transfer.familyContactName}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, familyContactName: e.target.value }))
                  }
                  placeholder={t("Name")}
                />
                <input
                  className={cn(inputClass, "mt-2")}
                  disabled={locked}
                  value={transfer.familyContactPhone}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, familyContactPhone: e.target.value }))
                  }
                  placeholder={t("Phone")}
                />
              </Field>
            </div>
            <Field label={t("Notes for receiving center")}>
              <textarea
                className={cn(inputClass, "min-h-[88px]")}
                disabled={locked}
                value={transfer.notesForReceivingCenter}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    notesForReceivingCenter: e.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">
            {t("Documents included in packet")}
          </h2>
          <ul className="space-y-2">
            {transfer.documents.map((doc) => (
              <li key={doc.id}>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line"
                    disabled={locked}
                    checked={doc.included}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        documents: prev.documents.map((d) =>
                          d.id === doc.id ? { ...d, included: e.target.checked } : d,
                        ),
                      }))
                    }
                  />
                  {t(doc.label)}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">{t("Activity")}</h2>
          <ul className="space-y-3">
            {transfer.timeline.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="font-medium text-ink">{t(entry.action)}</p>
                <p className="text-xs text-ink-faint">
                  {entry.actor} · {formatPortalTime(entry.at)}
                  {entry.detail ? ` · ${entry.detail}` : ""}
                </p>
              </li>
            ))}
          </ul>
          {canEdit && transfer.status !== "cancelled" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                patch((prev) => ({ ...prev, status: "cancelled" }), "Transfer cancelled");
                router.push("/community/transition");
              }}
            >
              {t("Cancel transfer")}
            </Button>
          ) : null}
        </section>

        {transfer.reasonId ? (
          <p className="text-center text-xs text-ink-faint">
            {t("Reason")}: {t(transferReasonLabel(transfer.reasonId))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
