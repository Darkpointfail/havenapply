"use client";

import {
  DossierField,
  SectionCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import type { ResidentDossier } from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";

export function StepHealth({
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
        eyebrow="Step 2 of 9"
        title="Health, in plain words"
        subtitle="No medical jargon required. Share what communities need to know."
      />

      <SectionCard className="space-y-5">
        <DossierField
          label="Medical conditions"
          optional
          hint="Chronic conditions or ongoing issues"
        >
          <textarea
            className={`${dossierFieldClass} min-h-[96px] resize-y`}
            value={value.medicalConditions}
            onChange={(e) => onChange({ medicalConditions: e.target.value })}
            placeholder={t("e.g. Hypertension, diabetes…")}
          />
        </DossierField>

        <DossierField label="Diagnoses" optional>
          <textarea
            className={`${dossierFieldClass} min-h-[80px] resize-y`}
            value={value.diagnoses}
            onChange={(e) => onChange({ diagnoses: e.target.value })}
            placeholder={t("Formal diagnoses, if known")}
          />
        </DossierField>

        <DossierField label="Allergies" optional>
          <input
            className={dossierFieldClass}
            value={value.allergies}
            onChange={(e) => onChange({ allergies: e.target.value })}
            placeholder={t("Medications, foods, or none known")}
          />
        </DossierField>

        <DossierField label="Current medications" optional>
          <textarea
            className={`${dossierFieldClass} min-h-[96px] resize-y`}
            value={value.currentMedications}
            onChange={(e) => onChange({ currentMedications: e.target.value })}
            placeholder={t("Name, dose, and when taken — or upload a list later")}
          />
        </DossierField>

        <div className="grid gap-4 sm:grid-cols-2">
          <DossierField label="Past surgeries" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.pastSurgeries}
              onChange={(e) => onChange({ pastSurgeries: e.target.value })}
            />
          </DossierField>
          <DossierField label="Recent hospitalizations" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.recentHospitalizations}
              onChange={(e) => onChange({ recentHospitalizations: e.target.value })}
            />
          </DossierField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <DossierField label="Vaccination status" optional>
            <input
              className={dossierFieldClass}
              value={value.vaccinationStatus}
              onChange={(e) => onChange({ vaccinationStatus: e.target.value })}
              placeholder={t("Up to date / unsure")}
            />
          </DossierField>
          <DossierField label="Height" optional>
            <input
              className={dossierFieldClass}
              value={value.height}
              onChange={(e) => onChange({ height: e.target.value })}
              placeholder={t("e.g. 5'6\" or 168 cm")}
            />
          </DossierField>
          <DossierField label="Weight" optional>
            <input
              className={dossierFieldClass}
              value={value.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
              placeholder={t("e.g. 145 lb")}
            />
          </DossierField>
        </div>

        <DossierField
          label="Important medical notes"
          optional
          hint="Anything else admissions should know"
        >
          <textarea
            className={`${dossierFieldClass} min-h-[100px] resize-y`}
            value={value.medicalNotes}
            onChange={(e) => onChange({ medicalNotes: e.target.value })}
          />
        </DossierField>
      </SectionCard>
    </div>
  );
}
