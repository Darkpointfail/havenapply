"use client";

import type { ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  REVIEW_CHECK_ITEMS,
  reviewChecklistProgress,
  type CommunityApplication,
  type ReviewCheckId,
} from "@/lib/community-portal";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

export type DossierTabId = "snapshot" | "clinical" | "medications" | "documents" | "family";

export const DOSSIER_TABS: { id: DossierTabId; label: string }[] = [
  { id: "snapshot", label: "Snapshot" },
  { id: "clinical", label: "Clinical" },
  { id: "medications", label: "Medications" },
  { id: "documents", label: "Documents" },
  { id: "family", label: "Family" },
];

/** Where the guided review checklist should jump to for each dossier section anchor. */
export const SECTION_TAB_MAP: Record<string, DossierTabId> = {
  "section-identity": "snapshot",
  "section-clinical": "clinical",
  "section-medications": "medications",
  "section-documents": "documents",
  "section-family": "family",
  "section-decision": "snapshot",
};

/** Full-width AI executive summary banner shown under the sticky header. */
export function AiSummaryBanner({
  summary,
  aiHighlights,
  aiFlags,
}: {
  summary?: string | null;
  aiHighlights?: string[];
  aiFlags?: string[];
}) {
  const t = useT();
  const hasHighlights = Boolean(aiHighlights && aiHighlights.length > 0);
  const hasFlags = Boolean(aiFlags && aiFlags.length > 0);

  return (
    <section style={{ backgroundColor: "#12312f" }} className="w-full">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-5 md:px-8 md:py-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
              {t("AI executive summary")}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-white/90">
              {summary ? t(summary) : ""}
            </p>
          </div>
        </div>

        {hasHighlights || hasFlags ? (
          <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
            {hasHighlights ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  {t("Fits")}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {aiHighlights!.map((item, i) => (
                    <li key={i} className="text-sm text-white/85">
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasFlags ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  {t("Worth a look")}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {aiFlags!.map((item, i) => (
                    <li key={i} className="text-sm text-white/85">
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Compact left-rail checklist: only the current (first unchecked) step
 * expands with actions, the rest are compact rows you can still jump to.
 */
export function ReviewChecklistRail({
  app,
  onToggle,
  onOpen,
}: {
  app: CommunityApplication;
  onToggle: (id: ReviewCheckId, value: boolean) => void;
  onOpen: (sectionId: string) => void;
}) {
  const t = useT();
  const progress = reviewChecklistProgress(app);
  const firstUnchecked = REVIEW_CHECK_ITEMS.find(
    (item) => !app.reviewChecklist?.[item.id],
  )?.id;

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{t("Review checklist")}</p>
          <p className="text-sm font-semibold tabular-nums text-brand">
            {progress.done}/{progress.total}
          </p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {REVIEW_CHECK_ITEMS.map((item) => {
          const checked = Boolean(app.reviewChecklist?.[item.id]);
          const isCurrent = !checked && item.id === firstUnchecked;

          if (isCurrent) {
            return (
              <li
                key={item.id}
                className="rounded-2xl border-[1.5px] border-brand bg-brand-soft/40 p-4"
              >
                <p className="text-[15px] font-medium text-ink">{t(item.label)}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{t(item.hint)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => onToggle(item.id, true)}>
                    {t("Mark done")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpen(item.sectionId)}
                  >
                    {t("Open")}
                  </Button>
                </div>
              </li>
            );
          }

          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  checked
                    ? "bg-brand text-white"
                    : "border-2 border-line bg-surface text-transparent",
                )}
              >
                {checked ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <button
                type="button"
                onClick={() => onOpen(item.sectionId)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-sm font-medium",
                  checked ? "text-ink-muted" : "text-ink-faint",
                )}
              >
                {t(item.label)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tab shell for the center dossier column; panel content is provided by the caller. */
export function DossierTabs({
  active,
  onChange,
  panels,
}: {
  active: DossierTabId;
  onChange: (id: DossierTabId) => void;
  panels: Partial<Record<DossierTabId, ReactNode>>;
}) {
  const t = useT();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
        {DOSSIER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-medium transition",
              active === tab.id
                ? "bg-brand text-white shadow-sm"
                : "text-ink-secondary hover:bg-bg-soft hover:text-ink",
            )}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4">{panels[active]}</div>
    </div>
  );
}
