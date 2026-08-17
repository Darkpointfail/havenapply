"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  DossierField,
  SectionCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import {
  newProfessional,
  type HealthcareProfessional,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/Button";

const ROLE_PRESETS: { role: HealthcareProfessional["role"]; label: string }[] = [
  { role: "primary_physician", label: "Primary physician" },
  { role: "social_worker", label: "Social worker" },
  { role: "hospital", label: "Hospital" },
  { role: "case_manager", label: "Case manager" },
  { role: "care_coordinator", label: "Care coordinator" },
  { role: "specialist", label: "Specialist" },
];

const ROLE_LABELS: Record<HealthcareProfessional["role"], string> = {
  primary_physician: "Primary physician",
  social_worker: "Social worker",
  hospital: "Hospital",
  case_manager: "Case manager",
  care_coordinator: "Care coordinator",
  specialist: "Specialist",
  other: "Other",
};

export function StepTeam({
  value,
  onChange,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
}) {
  const t = useT();

  const addRole = (role: HealthcareProfessional["role"]) => {
    onChange({ healthcareTeam: [...value.healthcareTeam, newProfessional(role)] });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 7 of 9"
        title="Healthcare team"
        subtitle="Who should communities call with clinical questions?"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {ROLE_PRESETS.map((p) => (
          <button
            key={p.role}
            type="button"
            onClick={() => addRole(p.role)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:bg-brand-soft/50"
          >
            <Plus size={14} />
            {t(p.label)}
          </button>
        ))}
      </div>

      {value.healthcareTeam.length === 0 ? (
        <SectionCard>
          <p className="text-sm text-ink-muted">
            {t("Add at least a primary physician when you can. Everything else is optional.")}
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {value.healthcareTeam.map((pro, i) => (
            <SectionCard key={pro.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {t(ROLE_LABELS[pro.role])}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      healthcareTeam: value.healthcareTeam.filter((x) => x.id !== pro.id),
                    })
                  }
                  className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft hover:text-danger"
                  aria-label={t("Remove")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DossierField label="Name">
                  <input
                    className={dossierFieldClass}
                    value={pro.name}
                    onChange={(e) => {
                      const next = [...value.healthcareTeam];
                      next[i] = { ...pro, name: e.target.value };
                      onChange({ healthcareTeam: next });
                    }}
                  />
                </DossierField>
                <DossierField label="Organization" optional>
                  <input
                    className={dossierFieldClass}
                    value={pro.organization}
                    onChange={(e) => {
                      const next = [...value.healthcareTeam];
                      next[i] = { ...pro, organization: e.target.value };
                      onChange({ healthcareTeam: next });
                    }}
                  />
                </DossierField>
                <DossierField label="Phone" optional>
                  <input
                    className={dossierFieldClass}
                    value={pro.phone}
                    onChange={(e) => {
                      const next = [...value.healthcareTeam];
                      next[i] = { ...pro, phone: e.target.value };
                      onChange({ healthcareTeam: next });
                    }}
                    inputMode="tel"
                  />
                </DossierField>
                <DossierField label="Email" optional>
                  <input
                    className={dossierFieldClass}
                    value={pro.email}
                    onChange={(e) => {
                      const next = [...value.healthcareTeam];
                      next[i] = { ...pro, email: e.target.value };
                      onChange({ healthcareTeam: next });
                    }}
                    inputMode="email"
                  />
                </DossierField>
              </div>
            </SectionCard>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => addRole("other")}
          >
            <Plus size={14} />
            {t("Add another professional")}
          </Button>
        </div>
      )}
    </div>
  );
}
