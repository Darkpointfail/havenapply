"use client";

import {
  DossierField,
  SectionCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import { newProfessional, type ResidentDossier } from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";

function joinAllergies(med: string, food: string): string {
  return [med.trim(), food.trim()].filter(Boolean).join("; ");
}

export function StepHealth({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  const physician =
    value.healthcareTeam.find((p) => p.role === "primary_physician") || null;

  const upsertPhysician = (
    patch: Partial<(typeof value.healthcareTeam)[0]>,
    extra?: Partial<ResidentDossier>,
  ) => {
    const existing = value.healthcareTeam.find(
      (p) => p.role === "primary_physician",
    );
    const healthcareTeam = existing
      ? value.healthcareTeam.map((p) =>
          p.id === existing.id ? { ...p, ...patch } : p,
        )
      : [
          ...value.healthcareTeam,
          { ...newProfessional("primary_physician"), ...patch },
        ];
    onChange({ healthcareTeam, ...extra });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 3 of 15"
        title="Medical information"
        subtitle="No jargon required. Share what residences need for admissions."
      />

      <div className="space-y-6">
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

          <DossierField
            label="Medication allergies & reactions"
            optional
            hint="Include the reaction when known"
          >
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.medicationAllergies}
              onChange={(e) => {
                const medicationAllergies = e.target.value;
                onChange({
                  medicationAllergies,
                  allergies: joinAllergies(
                    medicationAllergies,
                    value.foodEnvironmentalAllergies,
                  ),
                });
              }}
              placeholder={t("e.g. Penicillin: rash")}
            />
          </DossierField>

          <DossierField label="Food / environmental allergies" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.foodEnvironmentalAllergies}
              onChange={(e) => {
                const foodEnvironmentalAllergies = e.target.value;
                onChange({
                  foodEnvironmentalAllergies,
                  allergies: joinAllergies(
                    value.medicationAllergies,
                    foodEnvironmentalAllergies,
                  ),
                });
              }}
              placeholder={t("e.g. Peanuts, latex, pollen")}
            />
          </DossierField>

          <DossierField label="Current medications" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[96px] resize-y`}
              value={value.currentMedications}
              onChange={(e) => onChange({ currentMedications: e.target.value })}
              placeholder={t("Name, dose, and when taken: or upload a list later")}
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

          <DossierField label="Dietary requirements" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.dietaryRequirements}
              onChange={(e) => onChange({ dietaryRequirements: e.target.value })}
              placeholder={t("Texture, allergies, cultural or religious diet needs…")}
            />
          </DossierField>

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

        <SectionCard className="space-y-4">
          <p className="text-sm font-semibold text-ink">{t("Primary physician")}</p>
          <p className="text-sm text-ink-muted">
            {t("Who should residences call with clinical questions?")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DossierField label="Name" optional>
              <input
                className={dossierFieldClass}
                value={physician?.name || ""}
                onChange={(e) => upsertPhysician({ name: e.target.value })}
              />
            </DossierField>
            <DossierField label="Organization" optional>
              <input
                className={dossierFieldClass}
                value={physician?.organization || ""}
                onChange={(e) => upsertPhysician({ organization: e.target.value })}
              />
            </DossierField>
            <DossierField label="Phone" optional>
              <input
                className={dossierFieldClass}
                value={physician?.phone || ""}
                onChange={(e) => upsertPhysician({ phone: e.target.value })}
                inputMode="tel"
              />
            </DossierField>
            <DossierField label="Fax" optional>
              <input
                className={dossierFieldClass}
                value={physician?.fax || value.physicianFax || ""}
                onChange={(e) => {
                  const fax = e.target.value;
                  upsertPhysician({ fax }, { physicianFax: fax });
                }}
                inputMode="tel"
              />
            </DossierField>
            <div className="sm:col-span-2">
              <DossierField label="Address" optional>
                <input
                  className={dossierFieldClass}
                  value={physician?.address || ""}
                  onChange={(e) => upsertPhysician({ address: e.target.value })}
                />
              </DossierField>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <DossierField label="Preferred emergency hospital" optional>
            <input
              className={dossierFieldClass}
              value={value.preferredEmergencyHospital}
              onChange={(e) =>
                onChange({ preferredEmergencyHospital: e.target.value })
              }
              placeholder={t("Hospital name or campus")}
            />
          </DossierField>
        </SectionCard>
      </div>
    </div>
  );
}
