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
  CONTINENCE_OPTIONS,
  MEMORY_OPTIONS,
  MOBILITY_CARD_OPTIONS,
  NUTRITION_OPTIONS,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function StepCare({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  const toggleMulti = (key: "memoryCognition" | "nutrition", id: string) => {
    const cur = value[key];
    onChange({
      [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 3 of 9"
        title="Daily living & care"
        subtitle="Tap what fits. This helps match the right level of support."
      />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Mobility")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOBILITY_CARD_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.mobility === opt.id}
                onClick={() => onChange({ mobility: opt.id })}
                title={opt.label}
                description={opt.hint}
              />
            ))}
          </div>
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

        <SectionCard>
          <DossierField label="Behavioral concerns" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[80px] resize-y`}
              value={value.behavioralConcerns}
              onChange={(e) => onChange({ behavioralConcerns: e.target.value })}
              placeholder={t("Agitation, wandering, sundowning… or none")}
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

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Fall risk")}</p>
          <ChipToggle
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
            ]}
            selected={value.fallRisk}
            multi={false}
            onToggle={(id) => onChange({ fallRisk: id as ResidentDossier["fallRisk"] })}
          />
        </div>

        <SectionCard>
          <DossierField label="Special care needs" optional>
            <textarea
              className={`${dossierFieldClass} min-h-[90px] resize-y`}
              value={value.specialCareNeeds}
              onChange={(e) => onChange({ specialCareNeeds: e.target.value })}
              placeholder={t("Oxygen, wound care, dialysis, two-person assist…")}
            />
          </DossierField>
        </SectionCard>
      </div>
    </div>
  );
}
