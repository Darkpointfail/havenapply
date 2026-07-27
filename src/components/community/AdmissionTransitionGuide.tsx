"use client";

import { Check } from "lucide-react";
import {
  TRANSITION_CHECK_ITEMS,
  transitionChecklistProgress,
  type CommunityApplication,
  type TransitionCheckId,
} from "@/lib/community-portal";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

export function AdmissionTransitionGuide({
  app,
  closed,
  onToggle,
}: {
  app: CommunityApplication;
  closed?: boolean;
  onToggle: (id: TransitionCheckId, value: boolean) => void;
}) {
  const t = useT();
  const progress = transitionChecklistProgress(app);

  return (
    <aside className="rounded-2xl border border-line bg-surface p-4 shadow-xs md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Move-in transition</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("Finish contracts, payment, and family details before closing the dossier.")}
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
        {TRANSITION_CHECK_ITEMS.map((item, index) => {
          const checked = Boolean(app.transitionChecklist?.[item.id]);
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
                  disabled={closed}
                  onClick={() => onToggle(item.id, !checked)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                    checked
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong bg-surface text-transparent hover:border-brand",
                    closed && "opacity-60",
                  )}
                  aria-pressed={checked}
                  aria-label={item.label}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    <span className="mr-1.5 text-ink-faint">{index + 1}.</span>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{item.hint}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!closed ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {progress.complete
            ? "All transition steps done, you can close the dossier."
            : "Work these items with the family. Closing unlocks when every required step is done."}
        </p>
      ) : null}
    </aside>
  );
}
