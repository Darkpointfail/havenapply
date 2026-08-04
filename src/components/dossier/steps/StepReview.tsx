"use client";

import { AlertTriangle, CheckCircle2, Pencil, ShieldCheck } from "lucide-react";
import { SectionCard, StepIntro, dossierFieldClass } from "@/components/dossier/DossierFields";
import {
  AUTONOMY_LEVEL_OPTIONS,
  DOSSIER_STEPS,
  MOBILITY_CARD_OPTIONS,
  computeDossierCompleteness,
  type DossierStepId,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useFamilyData } from "@/lib/family-data";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const REVIEW_SECTIONS: DossierStepId[] = [
  "resident",
  "health",
  "care",
  "documents",
];

function summaryFor(step: DossierStepId, d: ResidentDossier, docCount: number): string {
  switch (step) {
    case "resident": {
      const name = [d.firstName, d.lastName].filter(Boolean).join(" ");
      return name || "Not started";
    }
    case "health":
      return d.medicalConditions || d.diagnoses || d.allergies || "No medical details yet";
    case "care":
      return d.autonomyLevel
        ? "Autonomy: {level}"
        : "Autonomy incomplete";
    case "documents":
      return docCount ? "{count} document(s)" : "No documents uploaded";
    default:
      return "";
  }
}

function summaryVars(
  step: DossierStepId,
  d: ResidentDossier,
  docCount: number,
): Record<string, string> | undefined {
  if (step === "documents" && docCount) {
    return { count: String(docCount) };
  }
  return undefined;
}

export function StepReview({
  value,
  onChange,
  onEdit,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
  onEdit: (stepId: DossierStepId) => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const { data } = useFamilyData();
  const completeness = computeDossierCompleteness(value, data.documents);
  const validated = Boolean(value.validatedAt);

  const validate = () => {
    onChange({
      validatedAt: new Date().toISOString(),
      validatedBy: user?.name || value.validatedBy || "Family",
    });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Steps 6–7 of 15"
        title="Review & validate"
        subtitle="Automatic completeness first. Then confirm the packet is ready to send."
      />

      <SectionCard className="mb-6 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-soft/80 via-surface to-teal-soft/40 px-6 py-7">
          <p className="text-sm font-medium text-ink-muted">{t("Profile completeness")}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-ink">
            {completeness.percent}%
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
        </div>
        <div className="space-y-2 px-6 py-5">
          {completeness.sections.map((s) => (
            <div key={s.id} className="flex items-start gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-deep" />
              ) : (
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" />
              )}
              <div>
                <p className="font-medium text-ink">
                  {s.done ? "✔ " : "⚠ "}
                  {t(s.label)}
                </p>
                {s.missing.length ? (
                  <ul className="mt-0.5 text-ink-muted">
                    {s.missing.slice(0, 3).map((m) => (
                      <li key={m}>{t(m)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mb-6 space-y-3">
        {REVIEW_SECTIONS.map((id) => {
          const meta = DOSSIER_STEPS.find((s) => s.id === id)!;
          const section = completeness.sections.find((s) => s.id === id);
          return (
            <SectionCard
              key={id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{t(meta.title)}</p>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {(() => {
                    const key = summaryFor(id, value, data.documents.length);
                    const vars = summaryVars(id, value, data.documents.length);
                    if (id === "care" && value.autonomyLevel) {
                      const levelLabel =
                        AUTONOMY_LEVEL_OPTIONS.find((o) => o.id === value.autonomyLevel)
                          ?.label || value.autonomyLevel;
                      const mobilityLabel =
                        MOBILITY_CARD_OPTIONS.find((o) => o.id === value.mobility)?.label ||
                        value.mobility;
                      return t(key, {
                        level: mobilityLabel
                          ? `${t(levelLabel)} · ${t(mobilityLabel)}`
                          : t(levelLabel),
                      });
                    }
                    return t(key, vars);
                  })()}
                </p>
                {section && !section.done ? (
                  <p className="mt-1 text-xs text-amber">{t("Needs attention")}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onEdit(id)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-bg-soft px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/50"
              >
                <Pencil size={14} />
                {t("Edit")}
              </button>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard
        className={cn(
          "space-y-4",
          validated ? "border-teal/30 bg-teal-soft/30" : "border-brand/20",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
            <ShieldCheck size={18} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-ink">{t("Family / social worker validation")}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {t(
                "Confirm that the information and documents are accurate enough to send to residences.",
              )}
            </p>
            {validated ? (
              <p className="mt-3 text-sm font-medium text-teal-deep">
                {t("Validated by {name}", {
                  name: value.validatedBy || user?.name || "Family",
                })}
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 text-sm">
                  <span className="font-medium text-ink">{t("Your name")}</span>
                  <input
                    className={dossierFieldClass}
                    value={value.validatedBy}
                    onChange={(e) => onChange({ validatedBy: e.target.value })}
                    placeholder={user?.name || t("Family member or social worker")}
                  />
                </label>
                <Button type="button" onClick={validate}>
                  {t("Validate dossier")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
