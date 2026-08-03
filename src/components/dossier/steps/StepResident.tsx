"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  ChipToggle,
  DossierField,
  SectionCard,
  SelectCard,
  StepIntro,
  dossierFieldClass,
} from "@/components/dossier/DossierFields";
import {
  LIVING_SITUATION_OPTIONS,
  newContact,
  type ContactPerson,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/Button";

const GENDERS = [
  { id: "Female", label: "Female" },
  { id: "Male", label: "Male" },
  { id: "Non-binary", label: "Non-binary" },
  { id: "Prefer not to say", label: "Prefer not to say" },
];

const LANGUAGES = [
  { id: "English", label: "English" },
  { id: "French", label: "French" },
  { id: "Spanish", label: "Spanish" },
  { id: "Other", label: "Other" },
];

function ContactEditor({
  contact,
  onChange,
  onRemove,
  title,
}: {
  contact: ContactPerson;
  onChange: (c: ContactPerson) => void;
  onRemove?: () => void;
  title: string;
}) {
  const t = useT();
  return (
    <SectionCard className="space-y-3 bg-bg-soft/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{t(title)}</p>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl p-2 text-ink-muted hover:bg-surface hover:text-danger"
            aria-label={t("Remove")}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DossierField label="Name" required>
          <input
            className={dossierFieldClass}
            value={contact.name}
            onChange={(e) => onChange({ ...contact, name: e.target.value })}
            placeholder={t("Full name")}
          />
        </DossierField>
        <DossierField label="Relationship">
          <input
            className={dossierFieldClass}
            value={contact.relationship}
            onChange={(e) => onChange({ ...contact, relationship: e.target.value })}
            placeholder={t("e.g. Daughter")}
          />
        </DossierField>
        <DossierField label="Phone">
          <input
            className={dossierFieldClass}
            value={contact.phone}
            onChange={(e) => onChange({ ...contact, phone: e.target.value })}
            placeholder={t("(555) 000-0000")}
            inputMode="tel"
          />
        </DossierField>
        <DossierField label="Email" optional>
          <input
            className={dossierFieldClass}
            value={contact.email}
            onChange={(e) => onChange({ ...contact, email: e.target.value })}
            placeholder={t("name@email.com")}
            inputMode="email"
          />
        </DossierField>
      </div>
    </SectionCard>
  );
}

export function StepResident({
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
        eyebrow="Steps 1–2 of 15"
        title="Administrative information"
        subtitle="Identity, contacts, and a light financial picture — once for every residence."
      />

      <div className="space-y-8">
        <SectionCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="First name" required>
              <input
                className={dossierFieldClass}
                value={value.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                autoComplete="given-name"
              />
            </DossierField>
            <DossierField label="Last name" required>
              <input
                className={dossierFieldClass}
                value={value.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                autoComplete="family-name"
              />
            </DossierField>
            <DossierField label="Preferred name" optional>
              <input
                className={dossierFieldClass}
                value={value.preferredName}
                onChange={(e) => onChange({ preferredName: e.target.value })}
                placeholder={t("What they like to be called")}
              />
            </DossierField>
            <DossierField label="Date of birth" required>
              <input
                type="date"
                className={dossierFieldClass}
                value={value.dateOfBirth}
                onChange={(e) => onChange({ dateOfBirth: e.target.value })}
              />
            </DossierField>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-ink">{t("Gender")}</p>
            <ChipToggle
              options={GENDERS}
              selected={value.gender}
              multi={false}
              onToggle={(id) => onChange({ gender: id })}
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-ink">{t("Primary language")}</p>
            <ChipToggle
              options={LANGUAGES}
              selected={value.primaryLanguage}
              multi={false}
              onToggle={(id) => onChange({ primaryLanguage: id })}
            />
          </div>
        </SectionCard>

        <SectionCard>
          <p className="mb-4 text-sm font-semibold text-ink">{t("Address")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DossierField label="Street address" optional>
                <input
                  className={dossierFieldClass}
                  value={value.address}
                  onChange={(e) => onChange({ address: e.target.value })}
                  autoComplete="street-address"
                />
              </DossierField>
            </div>
            <DossierField label="City">
              <input
                className={dossierFieldClass}
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
                autoComplete="address-level2"
              />
            </DossierField>
            <DossierField label="State / Province">
              <input
                className={dossierFieldClass}
                value={value.state}
                onChange={(e) => onChange({ state: e.target.value })}
                autoComplete="address-level1"
              />
            </DossierField>
            <DossierField label="ZIP / Postal code">
              <input
                className={dossierFieldClass}
                value={value.zip}
                onChange={(e) => onChange({ zip: e.target.value })}
                autoComplete="postal-code"
              />
            </DossierField>
            <DossierField label="Phone">
              <input
                className={dossierFieldClass}
                value={value.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                inputMode="tel"
                autoComplete="tel"
              />
            </DossierField>
            <div className="sm:col-span-2">
              <DossierField label="Email" optional>
                <input
                  className={dossierFieldClass}
                  value={value.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  inputMode="email"
                  autoComplete="email"
                />
              </DossierField>
            </div>
          </div>
        </SectionCard>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">
            {t("Current living situation")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {LIVING_SITUATION_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={value.livingSituation === opt.id}
                onClick={() => onChange({ livingSituation: opt.id })}
                title={opt.label}
              />
            ))}
          </div>
          {value.livingSituation === "other" ? (
            <div className="mt-3">
              <DossierField label="Please describe" optional>
                <input
                  className={dossierFieldClass}
                  value={value.livingSituationOther}
                  onChange={(e) => onChange({ livingSituationOther: e.target.value })}
                />
              </DossierField>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">{t("Emergency contact")}</p>
            {!value.emergencyContact ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  onChange({ emergencyContact: newContact({ isEmergency: true }) })
                }
              >
                <Plus size={14} />
                {t("Add")}
              </Button>
            ) : null}
          </div>
          {value.emergencyContact ? (
            <ContactEditor
              title="Emergency contact"
              contact={value.emergencyContact}
              onChange={(c) => onChange({ emergencyContact: c })}
              onRemove={() => onChange({ emergencyContact: null })}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              {t("Someone we can reach quickly if needed.")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">{t("Family members")}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onChange({ familyMembers: [...value.familyMembers, newContact()] })
              }
            >
              <Plus size={14} />
              {t("Add")}
            </Button>
          </div>
          {value.familyMembers.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {t("Optional. Add close family who should stay in the loop.")}
            </p>
          ) : (
            value.familyMembers.map((m, i) => (
              <ContactEditor
                key={m.id}
                title={`Family member ${i + 1}`}
                contact={m}
                onChange={(c) => {
                  const next = [...value.familyMembers];
                  next[i] = c;
                  onChange({ familyMembers: next });
                }}
                onRemove={() =>
                  onChange({
                    familyMembers: value.familyMembers.filter((x) => x.id !== m.id),
                  })
                }
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">
            {t("Legal guardian / Power of Attorney")}
          </p>
          <ChipToggle
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
            ]}
            selected={value.hasGuardianOrPoa}
            multi={false}
            onToggle={(id) =>
              onChange({
                hasGuardianOrPoa: id as ResidentDossier["hasGuardianOrPoa"],
                legalContacts:
                  id === "yes" && value.legalContacts.length === 0
                    ? [newContact({ isPoa: true })]
                    : value.legalContacts,
              })
            }
          />
          {value.hasGuardianOrPoa === "yes"
            ? value.legalContacts.map((m, i) => (
                <ContactEditor
                  key={m.id}
                  title="Guardian / POA"
                  contact={m}
                  onChange={(c) => {
                    const next = [...value.legalContacts];
                    next[i] = c;
                    onChange({ legalContacts: next });
                  }}
                  onRemove={() =>
                    onChange({
                      legalContacts: value.legalContacts.filter((x) => x.id !== m.id),
                    })
                  }
                />
              ))
            : null}
        </div>

        <SectionCard className="space-y-4">
          <p className="text-sm font-semibold text-ink">{t("Insurance & budget")}</p>
          <p className="text-sm text-ink-muted">
            {t("Optional now. Exact numbers can wait — ranges are fine.")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="Insurance" optional>
              <input
                className={dossierFieldClass}
                value={value.insurance}
                onChange={(e) => onChange({ insurance: e.target.value })}
                placeholder={t("Medicare, private plan, provincial coverage…")}
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
        </SectionCard>

        <SectionCard className="space-y-3">
          <p className="text-sm font-semibold text-ink">{t("Primary physician")}</p>
          <p className="text-sm text-ink-muted">
            {t("Who should residences call with clinical questions?")}
          </p>
          {(() => {
            const physician =
              value.healthcareTeam.find((p) => p.role === "primary_physician") ||
              null;
            const upsert = (patch: Partial<(typeof value.healthcareTeam)[0]>) => {
              const existing = value.healthcareTeam.find(
                (p) => p.role === "primary_physician",
              );
              if (existing) {
                onChange({
                  healthcareTeam: value.healthcareTeam.map((p) =>
                    p.id === existing.id ? { ...p, ...patch } : p,
                  ),
                });
              } else {
                onChange({
                  healthcareTeam: [
                    ...value.healthcareTeam,
                    {
                      id: `hp-${Date.now()}`,
                      role: "primary_physician",
                      name: "",
                      organization: "",
                      phone: "",
                      email: "",
                      ...patch,
                    },
                  ],
                });
              }
            };
            return (
              <div className="grid gap-3 sm:grid-cols-2">
                <DossierField label="Name" optional>
                  <input
                    className={dossierFieldClass}
                    value={physician?.name || ""}
                    onChange={(e) => upsert({ name: e.target.value })}
                  />
                </DossierField>
                <DossierField label="Phone" optional>
                  <input
                    className={dossierFieldClass}
                    value={physician?.phone || ""}
                    onChange={(e) => upsert({ phone: e.target.value })}
                    inputMode="tel"
                  />
                </DossierField>
              </div>
            );
          })()}
        </SectionCard>
      </div>
    </div>
  );
}
