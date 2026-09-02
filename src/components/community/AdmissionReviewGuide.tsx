"use client";

import { Check } from "lucide-react";
import {
  REVIEW_CHECK_ITEMS,
  reviewChecklistProgress,
  type CommunityApplication,
  type ReviewCheckId,
} from "@/lib/community-portal";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

export function AdmissionReviewGuide({
  app,
  decided,
  onToggle,
}: {
  app: CommunityApplication;
  decided?: boolean;
  onToggle: (id: ReviewCheckId, value: boolean) => void;
}) {
  const t = useT();
  const progress = reviewChecklistProgress(app);

  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="rounded-2xl border border-line bg-surface p-4 shadow-xs md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Admission in progress</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("Check every detail before you finalize.")}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-brand">
          {progress.done}/{progress.total}
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-soft">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {REVIEW_CHECK_ITEMS.map((item, index) => {
          const checked = Boolean(app.reviewChecklist?.[item.id]);
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 transition",
                checked ? "border-brand/25 bg-brand-soft/40" : "border-line bg-bg",
              )}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  disabled={decided}
                  onClick={() => onToggle(item.id, !checked)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                    checked
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong bg-surface text-transparent hover:border-brand",
                    decided && "opacity-60",
                  )}
                  aria-pressed={checked}
                  aria-label={item.label}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => scrollTo(item.sectionId)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium text-ink">
                      <span className="mr-1.5 text-ink-faint">{index + 1}.</span>
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{item.hint}</p>
                    <p className="mt-1 text-[11px] font-medium text-brand">Jump to section</p>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!decided ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {progress.complete
            ? "All checks complete, you can approve or decline below."
            : "Mark each item after you review it. Approve unlocks when all required checks are done."}
        </p>
      ) : null}
    </aside>
  );
}
