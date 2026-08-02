"use client";

import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { SectionCard, StepIntro } from "@/components/dossier/DossierFields";
import {
  DOSSIER_STEPS,
  computeDossierCompleteness,
  type DossierStepId,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useFamilyData } from "@/lib/family-data";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const REVIEW_SECTIONS: DossierStepId[] = [
  "resident",
  "health",
  "care",
  "looking",
  "financial",
  "documents",
  "team",
];

function summaryFor(step: DossierStepId, d: ResidentDossier, docCount: number): string {
  switch (step) {
    case "resident":
      return [d.firstName, d.lastName].filter(Boolean).join(" ") || "Not started";
    case "health":
      return d.medicalConditions || d.diagnoses || d.allergies || "No health details yet";
    case "care":
      return d.mobility
        ? `Mobility: ${d.mobility}${d.fallRisk === "yes" ? " · Fall risk" : ""}`
        : "Care needs incomplete";
    case "looking":
      return d.communityTypes.length
        ? d.communityTypes.join(", ")
        : "No community types selected";
    case "financial":
      return d.maxMonthlyBudget || d.budgetMax || d.insurance || "Financial info optional";
    case "documents":
      return docCount ? `${docCount} document(s)` : "No documents uploaded";
    case "team":
      return d.healthcareTeam.filter((p) => p.name.trim()).length
        ? `${d.healthcareTeam.filter((p) => p.name.trim()).length} contact(s)`
        : "No team contacts yet";
    default:
      return "";
  }
}

export function StepReview({
  value,
  onEdit,
}: {
  value: ResidentDossier;
  onEdit: (stepId: DossierStepId) => void;
}) {
  const t = useT();
  const { data } = useFamilyData();
  const completeness = computeDossierCompleteness(value, data.documents);

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 8 of 9"
        title="Review the dossier"
        subtitle="Almost there. Fix anything missing, then send it to communities."
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
                <p className={cn("font-medium", s.done ? "text-ink" : "text-ink")}>
                  {s.done ? "✔ " : "⚠ "}
                  {t(s.label)}
                </p>
                {s.missing.length ? (
                  <ul className="mt-0.5 text-ink-muted">
                    {s.missing.slice(0, 3).map((m) => (
                      <li key={m}>{t(m.startsWith("Missing") ? m : m)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="space-y-3">
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
                  {t(summaryFor(id, value, data.documents.length))}
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
    </div>
  );
}
