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
  ADL_ASSIST_LEVELS,
  ADL_CARD_ACTIVITIES,
  AUTONOMY_LEVEL_OPTIONS,
  CONTINENCE_OPTIONS,
  MEDICAL_TREATMENT_OPTIONS,
  MEMORY_OPTIONS,
  MOBILITY_DEVICE_OPTIONS,
  NUTRITION_OPTIONS,
  type ResidentDossier,
  type YesNoUnsure,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const YES_NO_UNSURE = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

/** Map first selected mobility device to legacy mobility string. */
function mobilityFromDevices(devices: string[]): string {
  if (!devices.length || devices.includes("none")) return "independent";
  if (devices.includes("motorized_wheelchair") || devices.includes("manual_wheelchair")) {
    return "wheelchair";
  }
  if (devices.includes("walker") || devices.includes("hoyer_lift")) return "walker";
  if (devices.includes("cane")) return "cane";
  return devices[0] || "";
}

export function StepCare({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  const toggleMulti = (
    key: "memoryCognition" | "nutrition" | "medicalTreatments" | "mobilityDevices",
    id: string,
  ) => {
    const cur = value[key];
    let next: string[];
    if (key === "mobilityDevices") {
      if (id === "none") {
        next = cur.includes("none") ? [] : ["none"];
      } else {
        next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur.filter((x) => x !== "none"), id];
      }
      onChange({
        mobilityDevices: next,
        mobility: mobilityFromDevices(next),
      });
      return;
    }
    next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ [key]: next });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 4 of 15"
        title="Autonomy level"
        subtitle="One overall level, then the daily details residences need."
      />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Overall autonomy")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {AUTONOMY_LEVEL_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.autonomyLevel === opt.id}
                onClick={() => onChange({ autonomyLevel: opt.id })}
                title={opt.label}
                description={opt.hint}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Mobility devices")}</p>
          <ChipToggle
            options={[...MOBILITY_DEVICE_OPTIONS]}
            selected={value.mobilityDevices}
            onToggle={(id) => toggleMulti("mobilityDevices", id)}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-ink">
            {t("Activities of Daily Living")}
          </p>
          <p className="mb-4 text-sm text-ink-muted">
            {t("How much help is needed for each?")}
          </p>
          <div className="space-y-3">
            {ADL_CARD_ACTIVITIES.map((act) => (
              <SectionCard key={act.id} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-ink">{t(act.label)}</p>
                  <div className="flex flex-wrap gap-2">
                    {ADL_ASSIST_LEVELS.map((lvl) => {
                      const on = value.adls[act.id] === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() =>
                            onChange({
                              adls: { ...value.adls, [act.id]: lvl.id },
                            })
                          }
                          className={cn(
                            "rounded-2xl px-3.5 py-2 text-sm font-medium transition",
                            on
                              ? "bg-ink text-white"
                              : "bg-bg-soft text-ink-muted hover:bg-brand-soft",
                          )}
                        >
                          {t(lvl.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Continence")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONTINENCE_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.continence === opt.id}
                onClick={() => onChange({ continence: opt.id })}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Memory & Cognition")}</p>
          <ChipToggle
            options={[...MEMORY_OPTIONS]}
            selected={value.memoryCognition}
            onToggle={(id) => toggleMulti("memoryCognition", id)}
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">
            {t("Formal dementia diagnosis")}
          </p>
          <ChipToggle
            options={YES_NO_UNSURE}
            selected={value.formalDementiaDiagnosis}
            multi={false}
            onToggle={(id) =>
              onChange({
                formalDementiaDiagnosis: id as YesNoUnsure,
              })
            }
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Prone to wandering")}</p>
          <ChipToggle
            options={YES_NO_UNSURE}
            selected={value.proneToWandering}
            multi={false}
            onToggle={(id) =>
              onChange({ proneToWandering: id as YesNoUnsure })
            }
          />
        </div>

        <SectionCard>
          <DossierField label="Behavioral concerns" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.behavioralConcerns}
              onChange={(e) => onChange({ behavioralConcerns: e.target.value })}
              placeholder={t("Agitation, sundowning… or none")}
            />
          </DossierField>
        </SectionCard>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Nutrition")}</p>
          <ChipToggle
            options={[...NUTRITION_OPTIONS]}
            selected={value.nutrition}
            onToggle={(id) => toggleMulti("nutrition", id)}
          />
        </div>

        <SectionCard className="space-y-4">
          <p className="text-sm font-semibold text-ink">{t("Falls in the past 90 days")}</p>
          <ChipToggle
            options={YES_NO_UNSURE}
            selected={value.fallsPast90Days}
            multi={false}
            onToggle={(id) =>
              onChange({
                fallsPast90Days: id as YesNoUnsure,
                fallRisk: id as YesNoUnsure,
              })
            }
          />
          {value.fallsPast90Days === "yes" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DossierField label="Number of falls" optional>
                <input
                  className={dossierFieldClass}
                  value={value.fallsCount}
                  onChange={(e) => onChange({ fallsCount: e.target.value })}
                  inputMode="numeric"
                />
              </DossierField>
              <DossierField label="Injury details" optional>
                <input
                  className={dossierFieldClass}
                  value={value.fallsInjuryDetails}
                  onChange={(e) => onChange({ fallsInjuryDetails: e.target.value })}
                  placeholder={t("Fracture, ER visit…")}
                />
              </DossierField>
            </div>
          ) : null}
        </SectionCard>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Medical treatments")}</p>
          <ChipToggle
            options={[...MEDICAL_TREATMENT_OPTIONS]}
            selected={value.medicalTreatments}
            onToggle={(id) => toggleMulti("medicalTreatments", id)}
          />
        </div>

        <SectionCard>
          <DossierField label="Special care needs" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[90px] resize-y`}
              value={value.specialCareNeeds}
              onChange={(e) => onChange({ specialCareNeeds: e.target.value })}
              placeholder={t("Two-person assist, specialty equipment…")}
            />
          </DossierField>
        </SectionCard>
      </div>
    </div>
  );
}
