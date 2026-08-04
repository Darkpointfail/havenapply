"use client";

import {
  ChipToggle,
  DossierField,
  SectionCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import type { ResidentDossier } from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";

export function StepFinancial({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 5 of 9"
        title="Financial picture"
        subtitle="Keep it simple. Exact numbers can wait — ranges are fine."
      />

      <SectionCard className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DossierField label="Monthly income" optional>
            <input
              className={dossierFieldClass}
              value={value.monthlyIncome}
              onChange={(e) => onChange({ monthlyIncome: e.target.value })}
              placeholder={t("Approximate")}
              inputMode="numeric"
            />
          </DossierField>
          <DossierField label="Maximum monthly budget" optional>
            <input
              className={dossierFieldClass}
              value={value.maxMonthlyBudget || value.budgetMax}
              onChange={(e) => onChange({ maxMonthlyBudget: e.target.value })}
              placeholder={t("What feels comfortable")}
              inputMode="numeric"
            />
          </DossierField>
        </div>

        <DossierField label="Insurance" optional>
          <input
            className={dossierFieldClass}
            value={value.insurance}
            onChange={(e) => onChange({ insurance: e.target.value })}
            placeholder={t("Medicare, private plan, provincial coverage…")}
          />
        </DossierField>

        <DossierField label="Government assistance" optional>
          <input
            className={dossierFieldClass}
            value={value.governmentAssistance}
            onChange={(e) => onChange({ governmentAssistance: e.target.value })}
            placeholder={t("Medicaid, provincial aid, none…")}
          />
        </DossierField>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">{t("Veterans benefits")}</p>
          <ChipToggle
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
            ]}
            selected={value.veteransBenefits}
            multi={false}
            onToggle={(id) =>
              onChange({ veteransBenefits: id as ResidentDossier["veteransBenefits"] })
            }
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            {t("Long-term care insurance")}
          </p>
          <ChipToggle
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
            ]}
            selected={value.longTermCareInsurance}
            multi={false}
            onToggle={(id) =>
              onChange({
                longTermCareInsurance: id as ResidentDossier["longTermCareInsurance"],
              })
            }
          />
        </div>

        <DossierField label="Optional notes" optional>
          <textarea
            className={`${dossierFieldClass} min-h-[80px] resize-y`}
            value={value.financialNotes}
            onChange={(e) => onChange({ financialNotes: e.target.value })}
          />
        </DossierField>
      </SectionCard>
    </div>
  );
}
