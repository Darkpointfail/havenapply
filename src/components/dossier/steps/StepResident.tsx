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
  ADVANCE_DIRECTIVE_OPTIONS,
  LIVING_SITUATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  contactPrimaryPhone,
  newContact,
  type ContactPerson,
  type ResidentDossier,
  type YesNoUnsure,
} from "@/lib/resident-dossier";
import { useT } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/Button";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";

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

const YES_NO_UNSURE = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

function patchContactPhones(
  contact: ContactPerson,
  patch: Partial<ContactPerson>,
): ContactPerson {
  const next = { ...contact, ...patch };
  next.phone = contactPrimaryPhone(next) || next.phone;
  return next;
}

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
        <DossierField label="Cell phone" optional>
          <input
            className={dossierFieldClass}
            value={contact.cellPhone || ""}
            onChange={(e) =>
              onChange(patchContactPhones(contact, { cellPhone: e.target.value }))
            }
            placeholder={t("(555) 000-0000")}
            inputMode="tel"
          />
        </DossierField>
        <DossierField label="Home phone" optional>
          <input
            className={dossierFieldClass}
            value={contact.homePhone || ""}
            onChange={(e) =>
              onChange(patchContactPhones(contact, { homePhone: e.target.value }))
            }
            placeholder={t("(555) 000-0000")}
            inputMode="tel"
          />
        </DossierField>
        <DossierField label="Work phone" optional>
          <input
            className={dossierFieldClass}
            value={contact.workPhone || ""}
            onChange={(e) =>
              onChange(patchContactPhones(contact, { workPhone: e.target.value }))
            }
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
        <div className="sm:col-span-2">
          <DossierField label="Street address" optional>
            <input
              className={dossierFieldClass}
              value={contact.address || ""}
              onChange={(e) => onChange({ ...contact, address: e.target.value })}
            />
          </DossierField>
        </div>
        <DossierField label="City" optional>
          <input
            className={dossierFieldClass}
            value={contact.city || ""}
            onChange={(e) => onChange({ ...contact, city: e.target.value })}
          />
        </DossierField>
        <DossierField label="State / Province" optional>
          <input
            className={dossierFieldClass}
            value={contact.state || ""}
            onChange={(e) => onChange({ ...contact, state: e.target.value })}
          />
        </DossierField>
        <DossierField label="ZIP / Postal code" optional>
          <input
            className={dossierFieldClass}
            value={contact.zip || ""}
            onChange={(e) => onChange({ ...contact, zip: e.target.value })}
          />
        </DossierField>
      </div>
    </SectionCard>
  );
}

function YesNoUnsureField({
  label,
  value,
  onChange,
  nameLabel,
  nameValue,
  onNameChange,
}: {
  label: string;
  value: YesNoUnsure;
  onChange: (v: YesNoUnsure) => void;
  nameLabel: string;
  nameValue: string;
  onNameChange: (name: string) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{t(label)}</p>
      <ChipToggle
        options={YES_NO_UNSURE}
        selected={value}
        multi={false}
        onToggle={(id) => onChange(id as YesNoUnsure)}
      />
      {value === "yes" ? (
        <DossierField label={nameLabel}>
          <input
            className={dossierFieldClass}
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("Full name")}
          />
        </DossierField>
      ) : null}
    </div>
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

  const toggleDirective = (id: string) => {
    const cur = value.advanceDirectives;
    onChange({
      advanceDirectives: cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [...cur, id],
    });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Steps 1–2 of 15"
        title="Administrative information"
        subtitle="Identity, contacts, and legal decision-makers: once for every residence."
      />

      <div className="space-y-8">
        <SectionCard>
          <ProfilePhotoPicker
            value={value.photoDataUrl || ""}
            initials={
              [value.firstName?.[0], value.lastName?.[0]]
                .filter(Boolean)
                .join("")
                .toUpperCase() || undefined
            }
            onChange={(photoDataUrl) => onChange({ photoDataUrl })}
          />
        </SectionCard>

        <SectionCard>
          <p className="mb-4 text-sm font-semibold text-ink">{t("Demographics")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="First name" required>
              <input
                className={dossierFieldClass}
                value={value.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                autoComplete="given-name"
              />
            </DossierField>
            <DossierField label="Middle name" optional>
              <input
                className={dossierFieldClass}
                value={value.middleName}
                onChange={(e) => onChange({ middleName: e.target.value })}
                autoComplete="additional-name"
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
            <DossierField label="Social Security Number" optional>
              <input
                className={dossierFieldClass}
                value={value.ssn}
                onChange={(e) => onChange({ ssn: e.target.value })}
                placeholder={t("XXX-XX-XXXX")}
                autoComplete="off"
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
            <p className="text-sm font-medium text-ink">{t("Marital status")}</p>
            <ChipToggle
              options={[...MARITAL_STATUS_OPTIONS]}
              selected={value.maritalStatus}
              multi={false}
              onToggle={(id) => onChange({ maritalStatus: id })}
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

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DossierField label="Religion" optional>
              <input
                className={dossierFieldClass}
                value={value.religion}
                onChange={(e) => onChange({ religion: e.target.value })}
              />
            </DossierField>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-ink">{t("Funeral home")}</p>
            <p className="text-sm text-ink-muted">{t("Optional. Used if arrangements are already set.")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <DossierField label="Funeral home name" optional>
                <input
                  className={dossierFieldClass}
                  value={value.funeralHomeName}
                  onChange={(e) => onChange({ funeralHomeName: e.target.value })}
                />
              </DossierField>
              <DossierField label="City" optional>
                <input
                  className={dossierFieldClass}
                  value={value.funeralHomeCity}
                  onChange={(e) => onChange({ funeralHomeCity: e.target.value })}
                />
              </DossierField>
              <DossierField label="Phone" optional>
                <input
                  className={dossierFieldClass}
                  value={value.funeralHomePhone}
                  onChange={(e) => onChange({ funeralHomePhone: e.target.value })}
                  inputMode="tel"
                />
              </DossierField>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="mb-4 text-sm font-semibold text-ink">{t("Address & living situation")}</p>
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

          <div className="mt-6">
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
        </SectionCard>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">
                {t("Primary contact / financial guarantor")}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {t("Emergency contact who can also act as financial guarantor.")}
              </p>
            </div>
            {!value.emergencyContact ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  onChange({
                    emergencyContact: newContact({
                      isEmergency: true,
                      isFinancialGuarantor: true,
                    }),
                  })
                }
              >
                <Plus size={14} />
                {t("Add")}
              </Button>
            ) : null}
          </div>
          {value.emergencyContact ? (
            <ContactEditor
              title="Primary contact / financial guarantor"
              contact={value.emergencyContact}
              onChange={(c) =>
                onChange({
                  emergencyContact: {
                    ...c,
                    isEmergency: true,
                    isFinancialGuarantor: true,
                  },
                })
              }
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
            <p className="text-sm font-semibold text-ink">{t("Secondary contact")}</p>
            {!value.secondaryContact ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onChange({ secondaryContact: newContact() })}
              >
                <Plus size={14} />
                {t("Add")}
              </Button>
            ) : null}
          </div>
          {value.secondaryContact ? (
            <ContactEditor
              title="Secondary contact"
              contact={value.secondaryContact}
              onChange={(c) => onChange({ secondaryContact: c })}
              onRemove={() => onChange({ secondaryContact: null })}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              {t("Optional backup contact.")}
            </p>
          )}
        </div>

        <SectionCard className="space-y-6">
          <p className="text-sm font-semibold text-ink">{t("Legal decision-making")}</p>

          <YesNoUnsureField
            label="Healthcare proxy"
            value={value.hasHealthcareProxy}
            onChange={(v) => onChange({ hasHealthcareProxy: v })}
            nameLabel="Healthcare proxy name"
            nameValue={value.healthcareProxyName}
            onNameChange={(name) => onChange({ healthcareProxyName: name })}
          />

          <YesNoUnsureField
            label="Financial power of attorney"
            value={value.hasFinancialPoa}
            onChange={(v) => onChange({ hasFinancialPoa: v })}
            nameLabel="Financial POA name"
            nameValue={value.financialPoaName}
            onNameChange={(name) => onChange({ financialPoaName: name })}
          />

          <YesNoUnsureField
            label="Legal guardian"
            value={value.hasLegalGuardian}
            onChange={(v) => onChange({ hasLegalGuardian: v })}
            nameLabel="Legal guardian name"
            nameValue={value.legalGuardianName}
            onNameChange={(name) => onChange({ legalGuardianName: name })}
          />

          <div>
            <p className="mb-3 text-sm font-semibold text-ink">{t("Advance directives")}</p>
            <ChipToggle
              options={[...ADVANCE_DIRECTIVE_OPTIONS]}
              selected={value.advanceDirectives}
              onToggle={toggleDirective}
            />
          </div>
        </SectionCard>

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
      </div>
    </div>
  );
}
