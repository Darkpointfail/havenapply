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
  COMMUNITY_TYPE_OPTIONS,
  ROOM_PREFERENCE_OPTIONS,
  SPECIAL_PREFERENCE_OPTIONS,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";

const DISTANCES = [
  { id: "10", label: "10 miles" },
  { id: "25", label: "25 miles" },
  { id: "50", label: "50 miles" },
  { id: "100", label: "100 miles" },
  { id: "0", label: "Anywhere" },
];

export function StepLooking({
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
        eyebrow="Step 4 of 9"
        title="What they're looking for"
        subtitle="Tell us the kind of place that would feel like home."
      />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Type of community")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {COMMUNITY_TYPE_OPTIONS.map((opt) => {
              const on = value.communityTypes.includes(opt.id);
              return (
                <SelectCard
                  key={opt.id}
                  selected={on}
                  onClick={() =>
                    onChange({
                      communityTypes: on
                        ? value.communityTypes.filter((x) => x !== opt.id)
                        : [...value.communityTypes, opt.id],
                    })
                  }
                  title={opt.label}
                />
              );
            })}
          </div>
        </div>

        <SectionCard className="space-y-4">
          <DossierField label="Desired move-in date" optional>
            <input
              type="date"
              className={dossierFieldClass}
              value={value.desiredMoveIn}
              onChange={(e) => onChange({ desiredMoveIn: e.target.value })}
            />
          </DossierField>

          <DossierField
            label="Preferred cities"
            hint="Comma-separated if more than one"
          >
            <input
              className={dossierFieldClass}
              value={value.preferredCities}
              onChange={(e) => onChange({ preferredCities: e.target.value })}
              placeholder={t("e.g. Montreal, Laval")}
            />
          </DossierField>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t("Maximum distance")}</p>
            <ChipToggle
              options={DISTANCES}
              selected={String(value.maxDistanceMiles)}
              multi={false}
              onToggle={(id) => onChange({ maxDistanceMiles: Number(id) })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="Budget min / month" optional>
              <input
                className={dossierFieldClass}
                value={value.budgetMin}
                onChange={(e) => onChange({ budgetMin: e.target.value })}
                placeholder={t("e.g. 3500")}
                inputMode="numeric"
              />
            </DossierField>
            <DossierField label="Budget max / month" optional>
              <input
                className={dossierFieldClass}
                value={value.budgetMax}
                onChange={(e) => onChange({ budgetMax: e.target.value })}
                placeholder={t("e.g. 5500")}
                inputMode="numeric"
              />
            </DossierField>
          </div>
        </SectionCard>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Room preference")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROOM_PREFERENCE_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.roomPreference === opt.id}
                onClick={() => onChange({ roomPreference: opt.id })}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">{t("Special preferences")}</p>
          <ChipToggle
            options={[...SPECIAL_PREFERENCE_OPTIONS]}
            selected={value.specialPreferences}
            onToggle={(id) =>
              onChange({
                specialPreferences: value.specialPreferences.includes(id)
                  ? value.specialPreferences.filter((x) => x !== id)
                  : [...value.specialPreferences, id],
              })
            }
          />
          <div className="mt-4">
            <DossierField label="Anything else?" optional>
              <textarea
                className={`${dossierFieldClass} min-h-[80px] resize-y`}
                value={value.specialPreferencesNotes}
                onChange={(e) => onChange({ specialPreferencesNotes: e.target.value })}
              />
            </DossierField>
          </div>
        </div>
      </div>
    </div>
  );
}
