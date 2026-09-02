"use client";

import {
  ChipToggle,
  DossierField,
  SectionCard,
  SelectCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import {
  PRIMARY_PAYOR_OPTIONS,
  type ResidentDossier,
  type YesNoUnsure,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";

const YES_NO_UNSURE = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-line/60 py-3 last:border-0 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-start">
      <p className="pt-3 text-sm font-medium text-ink">{label}</p>
      <div className="grid gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export function StepFinancial({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  const setPayor = (id: string) => {
    const labels: Record<string, string> = {
      private_pay: "Private pay",
      medicaid: "Medicaid",
      medicaid_pending: "Medicaid pending",
      long_term_care_insurance: "Long-term care insurance",
    };
    onChange({
      primaryPayor: id,
      insurance: value.insurance || labels[id] || value.insurance,
      ...(id === "long_term_care_insurance"
        ? { longTermCareInsurance: "yes" as const }
        : {}),
    });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Financial"
        title="Financial picture"
        subtitle="Payor, coverage IDs, income, and assets for LTC admissions."
      />

      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Primary payor")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIMARY_PAYOR_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.primaryPayor === opt.id}
                onClick={() => setPayor(opt.id)}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        <SectionCard className="space-y-1">
          <p className="mb-2 text-sm font-semibold text-ink">{t("Insurance coverage")}</p>

          <FieldRow label={t("Medicare A / B")}>
            <div className="sm:col-span-3">
              <DossierField label="Medicare A/B ID" optional>
                <input
                  className={dossierFieldClass}
                  value={value.medicarePartAbId}
                  onChange={(e) => onChange({ medicarePartAbId: e.target.value })}
                />
              </DossierField>
            </div>
          </FieldRow>

          <FieldRow label={t("Medicare Part D")}>
            <DossierField label="Company" optional>
              <input
                className={dossierFieldClass}
                value={value.medicarePartDCompany}
                onChange={(e) => onChange({ medicarePartDCompany: e.target.value })}
              />
            </DossierField>
            <DossierField label="Policy #" optional>
              <input
                className={dossierFieldClass}
                value={value.medicarePartDPolicy}
                onChange={(e) => onChange({ medicarePartDPolicy: e.target.value })}
              />
            </DossierField>
            <DossierField label="Group #" optional>
              <input
                className={dossierFieldClass}
                value={value.medicarePartDGroup}
                onChange={(e) => onChange({ medicarePartDGroup: e.target.value })}
              />
            </DossierField>
          </FieldRow>

          <FieldRow label={t("Medicaid")}>
            <DossierField label="Medicaid ID" optional>
              <input
                className={dossierFieldClass}
                value={value.medicaidId}
                onChange={(e) => onChange({ medicaidId: e.target.value })}
              />
            </DossierField>
            <div className="sm:col-span-2">
              <DossierField label="Case number" optional>
                <input
                  className={dossierFieldClass}
                  value={value.medicaidCaseNumber}
                  onChange={(e) => onChange({ medicaidCaseNumber: e.target.value })}
                />
              </DossierField>
            </div>
          </FieldRow>

          <FieldRow label={t("Supplemental insurance")}>
            <DossierField label="Company" optional>
              <input
                className={dossierFieldClass}
                value={value.supplementalInsuranceCompany}
                onChange={(e) =>
                  onChange({ supplementalInsuranceCompany: e.target.value })
                }
              />
            </DossierField>
            <DossierField label="Policy #" optional>
              <input
                className={dossierFieldClass}
                value={value.supplementalPolicyId}
                onChange={(e) => onChange({ supplementalPolicyId: e.target.value })}
              />
            </DossierField>
            <DossierField label="Group #" optional>
              <input
                className={dossierFieldClass}
                value={value.supplementalGroupNumber}
                onChange={(e) =>
                  onChange({ supplementalGroupNumber: e.target.value })
                }
              />
            </DossierField>
          </FieldRow>

          <FieldRow label={t("Long-term care insurance")}>
            <DossierField label="Company" optional>
              <input
                className={dossierFieldClass}
                value={value.ltcInsuranceCompany}
                onChange={(e) => onChange({ ltcInsuranceCompany: e.target.value })}
              />
            </DossierField>
            <DossierField label="Policy #" optional>
              <input
                className={dossierFieldClass}
                value={value.ltcPolicyId}
                onChange={(e) => onChange({ ltcPolicyId: e.target.value })}
              />
            </DossierField>
            <DossierField label="Group #" optional>
              <input
                className={dossierFieldClass}
                value={value.ltcGroupNumber}
                onChange={(e) => onChange({ ltcGroupNumber: e.target.value })}
              />
            </DossierField>
          </FieldRow>
        </SectionCard>

        {value.primaryPayor === "medicaid_pending" ? (
          <SectionCard className="space-y-4">
            <p className="text-sm font-semibold text-ink">{t("Medicaid pending")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DossierField label="Pending application date" optional>
                <input
                  type="date"
                  className={dossierFieldClass}
                  value={value.medicaidPendingDate}
                  onChange={(e) => onChange({ medicaidPendingDate: e.target.value })}
                />
              </DossierField>
              <DossierField label="Pending case number" optional>
                <input
                  className={dossierFieldClass}
                  value={value.medicaidPendingCaseNumber}
                  onChange={(e) =>
                    onChange({ medicaidPendingCaseNumber: e.target.value })
                  }
                />
              </DossierField>
              <DossierField label="Attorney name" optional>
                <input
                  className={dossierFieldClass}
                  value={value.medicaidAttorneyName}
                  onChange={(e) => onChange({ medicaidAttorneyName: e.target.value })}
                />
              </DossierField>
              <DossierField label="Attorney phone" optional>
                <input
                  className={dossierFieldClass}
                  value={value.medicaidAttorneyPhone}
                  onChange={(e) =>
                    onChange({ medicaidAttorneyPhone: e.target.value })
                  }
                  inputMode="tel"
                />
              </DossierField>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard className="space-y-4">
          <p className="text-sm font-semibold text-ink">{t("Monthly income")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="Social Security" optional>
              <input
                className={dossierFieldClass}
                value={value.incomeSocialSecurity}
                onChange={(e) => onChange({ incomeSocialSecurity: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="Pension" optional>
              <input
                className={dossierFieldClass}
                value={value.incomePension}
                onChange={(e) => onChange({ incomePension: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="VA benefits" optional>
              <input
                className={dossierFieldClass}
                value={value.incomeVa}
                onChange={(e) => {
                  const incomeVa = e.target.value;
                  onChange({
                    incomeVa,
                    veteransBenefits: incomeVa.trim()
                      ? "yes"
                      : value.veteransBenefits,
                  });
                }}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="Other income" optional>
              <input
                className={dossierFieldClass}
                value={value.incomeOther}
                onChange={(e) => onChange({ incomeOther: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <p className="text-sm font-semibold text-ink">{t("Assets")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <DossierField label="Checking" optional>
              <input
                className={dossierFieldClass}
                value={value.assetsChecking}
                onChange={(e) => onChange({ assetsChecking: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="Savings" optional>
              <input
                className={dossierFieldClass}
                value={value.assetsSavings}
                onChange={(e) => onChange({ assetsSavings: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="Investments" optional>
              <input
                className={dossierFieldClass}
                value={value.assetsInvestments}
                onChange={(e) => onChange({ assetsInvestments: e.target.value })}
                inputMode="numeric"
              />
            </DossierField>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t("Owns a home")}</p>
            <ChipToggle
              options={YES_NO_UNSURE}
              selected={value.ownsHome}
              multi={false}
              onToggle={(id) => onChange({ ownsHome: id as YesNoUnsure })}
            />
          </div>
          {value.ownsHome === "yes" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DossierField label="Market value" optional>
                <input
                  className={dossierFieldClass}
                  value={value.homeMarketValue}
                  onChange={(e) => onChange({ homeMarketValue: e.target.value })}
                  inputMode="numeric"
                />
              </DossierField>
              <DossierField label="Mortgage balance" optional>
                <input
                  className={dossierFieldClass}
                  value={value.homeMortgageBalance}
                  onChange={(e) => onChange({ homeMortgageBalance: e.target.value })}
                  inputMode="numeric"
                />
              </DossierField>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              {t("Asset transfer in the past 5 years")}
            </p>
            <ChipToggle
              options={YES_NO_UNSURE}
              selected={value.assetTransferPast5Years}
              multi={false}
              onToggle={(id) =>
                onChange({ assetTransferPast5Years: id as YesNoUnsure })
              }
            />
          </div>
          {value.assetTransferPast5Years === "yes" ? (
            <DossierField label="Transfer details" optional>
              <textarea
                className={`${dossierFieldClass} min-h-[80px] resize-y`}
                value={value.assetTransferDetails}
                onChange={(e) => onChange({ assetTransferDetails: e.target.value })}
              />
            </DossierField>
          ) : null}
        </SectionCard>

        <SectionCard className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t("Veterans benefits")}</p>
            <ChipToggle
              options={YES_NO_UNSURE}
              selected={value.veteransBenefits}
              multi={false}
              onToggle={(id) =>
                onChange({ veteransBenefits: id as YesNoUnsure })
              }
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              {t("Long-term care insurance")}
            </p>
            <ChipToggle
              options={YES_NO_UNSURE}
              selected={value.longTermCareInsurance}
              multi={false}
              onToggle={(id) =>
                onChange({
                  longTermCareInsurance: id as YesNoUnsure,
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
    </div>
  );
}
