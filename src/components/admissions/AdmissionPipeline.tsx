"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { ApplicationStatus } from "@/data/applications";
import { ADMISSION_PIPELINE } from "@/lib/resident-dossier";
import { TRANSITION_CHECK_ITEMS } from "@/lib/community-portal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function pipelinePhaseForStatus(
  status: ApplicationStatus,
  checklist?: Partial<Record<string, boolean>> | null,
): (typeof ADMISSION_PIPELINE)[number]["id"] {
  if (status === "closed") return "admission";
  if (status === "move_in_scheduled") {
    return checklist?.familyDetails ? "admission" : "arrival";
  }
  if (["approved", "conditionally_approved", "offer_received"].includes(status)) {
    if (checklist?.contract && checklist?.payment && checklist?.familyDetails && checklist?.moveInDate) {
      return "admission";
    }
    if (checklist?.contract && checklist?.payment) return "arrival";
    if (checklist?.contract) return "deposit";
    return "signature";
  }
  if (status === "waitlisted") return "decision";
  if (status === "declined" || status === "withdrawn") return "decision";
  if (status === "more_info") return "more_info";
  if (
    ["under_review", "received", "assessment_requested", "tour_requested"].includes(status)
  ) {
    return "review";
  }
  if (status === "submitted" || status === "ready") return "sent";
  return "sent";
}

export function AdmissionPipelineStrip({
  status,
  checklist,
}: {
  status: ApplicationStatus;
  checklist?: Partial<Record<string, boolean>> | null;
}) {
  const t = useT();
  const current = pipelinePhaseForStatus(status, checklist);
  const currentIdx = ADMISSION_PIPELINE.findIndex((p) => p.id === current);

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max gap-2 pb-1">
        {ADMISSION_PIPELINE.map((phase, i) => {
          const done = i < currentIdx || (status === "closed" && phase.id === "admission");
          const active = phase.id === current;
          return (
            <li
              key={phase.id}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                done
                  ? "bg-teal-soft text-teal-deep"
                  : active
                    ? "bg-ink text-white"
                    : "bg-bg-soft text-ink-faint",
              )}
            >
              {done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span>
                {phase.step}. {t(phase.label)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function PostDecisionChecklist({
  checklist,
  editable,
  onToggle,
  onMarkAdmitted,
  canAdmit,
}: {
  checklist: Partial<Record<string, boolean>>;
  editable?: boolean;
  onToggle?: (id: string, value: boolean) => void;
  onMarkAdmitted?: () => void;
  canAdmit?: boolean;
}) {
  const t = useT();
  const items = TRANSITION_CHECK_ITEMS;
  const done = items.filter((i) => Boolean(checklist[i.id])).length;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{t("After acceptance")}</p>
          <p className="text-sm text-ink-muted">
            {t("Steps 12–15 · Signature, deposit, arrival, admission")}
          </p>
        </div>
        <p className="text-sm font-medium text-ink-muted">
          {done}/{items.length}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const on = Boolean(checklist[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!editable}
                onClick={() => onToggle?.(item.id, !on)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  on
                    ? "border-teal/30 bg-teal-soft/40"
                    : "border-line bg-surface hover:border-brand/30",
                  !editable && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-teal-deep bg-teal-deep text-white" : "border-line",
                  )}
                >
                  {on ? <CheckCircle2 size={12} /> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t(item.label)}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hint)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {editable && onMarkAdmitted ? (
        <button
          type="button"
          disabled={!canAdmit}
          onClick={onMarkAdmitted}
          className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-45"
        >
          {t("Mark as admitted")}
        </button>
      ) : null}
    </div>
  );
}
