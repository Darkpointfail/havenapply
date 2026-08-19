"use client";

import { AlertTriangle, CheckCircle2, Pencil, ShieldCheck } from "lucide-react";
import {
  DossierField,
  SectionCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import {
  DOSSIER_STEPS,
  PRIMARY_PAYOR_OPTIONS,
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
  "financial",
  "documents",
];

function summaryFor(step: DossierStepId, d: ResidentDossier, docCount: number): string {
  switch (step) {
    case "resident":
      return [d.firstName, d.lastName].filter(Boolean).join(" ") || "Not started";
    case "health":
      return d.medicalConditions || d.diagnoses || d.allergies || "No medical details yet";
    case "care":
      return d.autonomyLevel
        ? `Autonomy: ${d.autonomyLevel}${d.mobility ? ` · ${d.mobility}` : ""}`
        : "Autonomy incomplete";
    case "financial": {
      const payorLabel =
        PRIMARY_PAYOR_OPTIONS.find((p) => p.id === d.primaryPayor)?.label ||
        d.primaryPayor;
      if (payorLabel) return `Payor: ${payorLabel}`;
      if (d.insurance || d.maxMonthlyBudget || d.monthlyIncome) {
        return "Financial details started";
      }
      return "Financial incomplete";
    }
    case "documents":
      return docCount ? `${docCount} document(s)` : "No documents uploaded";
    default:
      return "";
  }
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
    if (!value.acknowledgementSigned) {
      return;
    }
    const signer =
      value.signatureName.trim() ||
      value.validatedBy.trim() ||
      user?.name ||
      "Family";
    onChange({
      validatedAt: new Date().toISOString(),
      validatedBy: signer,
      signatureName: value.signatureName.trim() || signer,
      signatureDate: value.signatureDate || new Date().toISOString().slice(0, 10),
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

      <SectionCard className="mb-6 space-y-4">
        <p className="font-semibold text-ink">{t("Acknowledgement & signature")}</p>
        <p className="text-sm text-ink-muted">
          {t(
            "Certify that the information in this admission packet is accurate to the best of your knowledge.",
          )}
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
            checked={value.acknowledgementSigned}
            onChange={(e) => onChange({ acknowledgementSigned: e.target.checked })}
          />
          <span>
            {t(
              "I acknowledge that the information provided is true and complete to the best of my knowledge.",
            )}
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <DossierField label="Signature name" required>
            <input
              className={dossierFieldClass}
              value={value.signatureName}
              onChange={(e) => onChange({ signatureName: e.target.value })}
              placeholder={user?.name || t("Full legal name")}
            />
          </DossierField>
          <DossierField label="Relationship to resident" optional>
            <input
              className={dossierFieldClass}
              value={value.signatureRelationship}
              onChange={(e) => onChange({ signatureRelationship: e.target.value })}
              placeholder={t("e.g. Daughter, Self, Social worker")}
            />
          </DossierField>
          <DossierField label="Signature date" optional>
            <input
              type="date"
              className={dossierFieldClass}
              value={value.signatureDate}
              onChange={(e) => onChange({ signatureDate: e.target.value })}
            />
          </DossierField>
        </div>
      </SectionCard>

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
                    placeholder={
                      value.signatureName ||
                      user?.name ||
                      t("Family member or social worker")
                    }
                  />
                </label>
                <Button
                  type="button"
                  onClick={validate}
                  disabled={!value.acknowledgementSigned}
                >
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
