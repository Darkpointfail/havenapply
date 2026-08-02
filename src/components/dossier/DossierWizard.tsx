"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Cloud } from "lucide-react";
import {
  DOSSIER_STEPS,
  computeDossierCompleteness,
  seedDossierFromFamily,
  type DossierStepId,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useFamilyData } from "@/lib/family-data";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StepResident } from "@/components/dossier/steps/StepResident";
import { StepHealth } from "@/components/dossier/steps/StepHealth";
import { StepCare } from "@/components/dossier/steps/StepCare";
import { StepLooking } from "@/components/dossier/steps/StepLooking";
import { StepFinancial } from "@/components/dossier/steps/StepFinancial";
import { StepDocuments } from "@/components/dossier/steps/StepDocuments";
import { StepTeam } from "@/components/dossier/steps/StepTeam";
import { StepReview } from "@/components/dossier/steps/StepReview";
import { StepSubmit } from "@/components/dossier/steps/StepSubmit";

export function DossierWizard() {
  const t = useT();
  const { ready, data, updateResidentDossier, saveResidentDossier } = useFamilyData();
  const [draft, setDraft] = useState<ResidentDossier | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ready || seeded.current) return;
    const seededDraft = seedDossierFromFamily(
      data.senior,
      data.careNeeds,
      data.residentDossier,
    );
    if (!seededDraft.startedAt) {
      seededDraft.startedAt = new Date().toISOString();
    }
    setDraft(seededDraft);
    seeded.current = true;
  }, [ready, data.senior, data.careNeeds, data.residentDossier]);

  const persistDraft = useEffectEvent((next: ResidentDossier) => {
    setSaveState("saving");
    updateResidentDossier(next);
    setSaveState("saved");
    window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1600);
  });

  const patch = (partial: Partial<ResidentDossier>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial, lastSavedAt: new Date().toISOString() };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistDraft(next), 450);
      return next;
    });
  };

  const goTo = (index: number) => {
    if (!draft) return;
    const clamped = Math.max(0, Math.min(DOSSIER_STEPS.length - 1, index));
    patch({ stepIndex: clamped });
  };

  const goToStepId = (id: DossierStepId) => {
    const idx = DOSSIER_STEPS.findIndex((s) => s.id === id);
    if (idx >= 0) goTo(idx);
  };

  if (!ready || !draft) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-brand-soft" />
      </div>
    );
  }

  const step = DOSSIER_STEPS[draft.stepIndex] || DOSSIER_STEPS[0];
  const completeness = computeDossierCompleteness(draft, data.documents);
  const progress = ((draft.stepIndex + 1) / DOSSIER_STEPS.length) * 100;
  const isLast = draft.stepIndex >= DOSSIER_STEPS.length - 1;
  const isFirst = draft.stepIndex === 0;

  const finalize = () => {
    saveResidentDossier(draft, { finalize: true });
  };

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(45,122,120,0.12),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(232,196,160,0.22),transparent),linear-gradient(180deg,#fbfaf7_0%,#f3f1ec_100%)]">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/family/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={16} />
            {t("Exit")}
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              HavenApply
            </p>
            <p className="text-sm font-medium text-ink">{t("Resident dossier")}</p>
          </div>
          <div className="flex min-w-[7rem] items-center justify-end gap-1.5 text-xs text-ink-muted">
            <Cloud size={14} className={saveState === "saving" ? "animate-pulse" : ""} />
            {saveState === "saving"
              ? t("Saving…")
              : saveState === "saved"
                ? t("Saved")
                : draft.lastSavedAt
                  ? t("Autosaved")
                  : t("Draft")}
          </div>
        </div>
        <div className="h-1 w-full bg-line/60">
          <div
            className="h-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-28 pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {DOSSIER_STEPS.map((s, i) => {
              const done = i < draft.stepIndex;
              const current = i === draft.stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  title={t(s.title)}
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition",
                    current
                      ? "bg-ink text-white"
                      : done
                        ? "bg-brand-soft text-brand-strong"
                        : "bg-bg-soft text-ink-faint hover:bg-line/60",
                  )}
                >
                  {done ? <Check size={12} /> : i + 1}
                </button>
              );
            })}
          </div>
          <div className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">
            {completeness.percent}% {t("complete")}
          </div>
        </div>

        <p className="mb-1 text-sm text-ink-muted">
          {t(step.short)} · {t("About {n} min", { n: String(step.minutes) })}
        </p>

        {step.id === "resident" ? (
          <StepResident value={draft} onChange={patch} />
        ) : null}
        {step.id === "health" ? <StepHealth value={draft} onChange={patch} /> : null}
        {step.id === "care" ? <StepCare value={draft} onChange={patch} /> : null}
        {step.id === "looking" ? <StepLooking value={draft} onChange={patch} /> : null}
        {step.id === "financial" ? (
          <StepFinancial value={draft} onChange={patch} />
        ) : null}
        {step.id === "documents" ? <StepDocuments /> : null}
        {step.id === "team" ? <StepTeam value={draft} onChange={patch} /> : null}
        {step.id === "review" ? (
          <StepReview value={draft} onEdit={goToStepId} />
        ) : null}
        {step.id === "submit" ? (
          <StepSubmit value={draft} onChange={patch} onFinalize={finalize} />
        ) : null}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isFirst}
            onClick={() => goTo(draft.stepIndex - 1)}
          >
            <ArrowLeft size={16} />
            {t("Back")}
          </Button>
          {!isLast ? (
            <Button type="button" onClick={() => goTo(draft.stepIndex + 1)}>
              {t("Continue")}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="secondary" href="/family/applications">
              {t("My applications")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
