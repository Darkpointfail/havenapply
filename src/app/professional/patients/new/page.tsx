"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfessional } from "@/lib/professional-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

const steps = ["Basics", "Care profile", "Documents", "Review"] as const;

export default function AddPatientPage() {

  const t = useT();  const router = useRouter();
  const { addPatient, organization } = useProfessional();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("Female");
  const [currentLocation, setCurrentLocation] = useState("");
  const [language, setLanguage] = useState("English");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [familyContact, setFamilyContact] = useState("");
  const [familyRelation, setFamilyRelation] = useState("Daughter");
  const [unit, setUnit] = useState(organization.units[0] || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [mobility, setMobility] = useState("");
  const [memory, setMemory] = useState("");
  const [careLevel, setCareLevel] = useState("Assisted living");
  const [insurance, setInsurance] = useState("");
  const [budget, setBudget] = useState("");
  const [region, setRegion] = useState("");
  const [docsNoted, setDocsNoted] = useState(false);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

  const onFinish = (e: FormEvent) => {
    e.preventDefault();
    const patient = addPatient({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      currentLocation: currentLocation || `${organization.name} · ${unit}`,
      language,
      emergencyContact,
      emergencyPhone,
      familyContact: familyContact || emergencyContact,
      familyRelation,
      hospital: organization.name,
      unit,
      care: {
        diagnosis,
        mobility,
        memory,
        requiredCareLevel: careLevel,
        insurance,
        budget,
        preferredRegion: region,
      },
    });
    router.push(`/professional/patients/${patient.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8">
      <PageHeader
        title={t("Add patient")}
        description="Build one admissions folder. You’ll reuse it across communities."
        breadcrumbs={[
          { label: "Patients", href: "/professional/patients" },
          { label: "Add patient" },
        ]}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              i === step ? "bg-brand text-white" : "bg-bg-soft text-ink-muted",
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < steps.length - 1) setStep((s) => s + 1);
            else onFinish(e);
          }}
          className="space-y-4"
        >
          {step === 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t("First name")}
                  <input required className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  {t("Last name")}
                  <input required className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t("Date of birth")}
                  <input required type="date" className={inputClass} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  Gender
                  <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium">
                {t("Current location")}
                <input
                  className={inputClass}
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder={`${organization.name} · ${unit}`}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Unit
                  <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {organization.units.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  {t("Primary language")}
                  <input className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t("Emergency contact")}
                  <input required className={inputClass} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  {t("Phone")}
                  <input required className={inputClass} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t("Family representative")}
                  <input className={inputClass} value={familyContact} onChange={(e) => setFamilyContact(e.target.value)} placeholder={t("Defaults to emergency contact")} />
                </label>
                <label className="text-sm font-medium">
                  Relation
                  <input className={inputClass} value={familyRelation} onChange={(e) => setFamilyRelation(e.target.value)} />
                </label>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <label className="block text-sm font-medium">
                Diagnosis
                <input className={inputClass} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Mobility
                  <input className={inputClass} value={mobility} onChange={(e) => setMobility(e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  Memory
                  <input className={inputClass} value={memory} onChange={(e) => setMemory(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t("Required care level")}
                  <select className={inputClass} value={careLevel} onChange={(e) => setCareLevel(e.target.value)}>
                    <option>Assisted living</option>
                    <option>Memory care</option>
                    <option>Nursing care</option>
                    <option>Independent living</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Insurance
                  <input className={inputClass} value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Budget
                  <input className={inputClass} value={budget} onChange={(e) => setBudget(e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  {t("Preferred location")}
                  <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="rounded-2xl border border-dashed border-line bg-bg-soft/60 px-5 py-10 text-center">
              <p className="font-medium text-ink">Upload documents</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                {t("Drag & drop discharge summaries, medication lists, and insurance cards. Haven can")}
                suggest structured fields, you always review before anything is shared.
              </p>
              <label className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={docsNoted}
                  onChange={(e) => setDocsNoted(e.target.checked)}
                />
                {t("I’ll upload documents from the patient folder next")}
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-ink">Review before saving</p>
              <p className="text-ink-muted">
                {firstName} {lastName} · {gender} · {language}
              </p>
              <p className="text-ink-muted">
                Location: {currentLocation || `${organization.name} · ${unit}`}
              </p>
              <p className="text-ink-muted">
                Family: {familyContact || emergencyContact} · Care level: {careLevel || "—"}
              </p>
              <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-brand-strong">
                {t("The patient will open as Building profile until the checklist is complete. When")}
                everything required is done, status becomes Ready to apply.
              </p>
            </div>
          ) : null}

          <div className="flex justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              {t("Back")}
            </Button>
            <Button type="submit">
              {step === steps.length - 1 ? "Create patient" : "Continue"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
