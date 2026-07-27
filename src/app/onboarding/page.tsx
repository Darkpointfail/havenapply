"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AuthAlert } from "@/components/auth/AuthForm";
import { RequireAuth } from "@/components/auth/RequireAuth";
import {
  ChoiceCard,
  Field,
  MultiChip,
  YesNoUnsure,
  fieldClass,
} from "@/components/onboarding/OnboardingFields";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  FILLER_OPTIONS,
  FUNDING_MODES,
  HOUSING_TYPES,
  LIVING_SITUATIONS,
  ONBOARDING_STEPS,
  RADIUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
  URGENCY_OPTIONS,
  labelForId,
  seniorAge,
  seniorDisplayName,
  isSelfApplicant,
  type SearchZone,
  type SeniorProfile,
} from "@/lib/senior-profile";
import { cn } from "@/lib/utils";

function OnboardingInner() {
  const router = useRouter();
  const { completeOnboarding, user } = useAuth();
  const {
    ready,
    data,
    updateSeniorDraft,
    setOnboardingStep,
    finalizeSeniorProfile,
  } = useFamilyData();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const draft = data.senior;

  useEffect(() => {
    if (!ready) return;
    if (user?.onboardingCompleted && data.seniorCreated) {
      router.replace("/family/dashboard");
      return;
    }
    setStep(Math.min(data.onboarding.stepIndex, ONBOARDING_STEPS.length - 1));
    // Only sync from storage when ready / completion state changes, not on every draft keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.onboardingCompleted, data.seniorCreated, router]);

  // Resume step once when family data loads
  useEffect(() => {
    if (!ready || (user?.onboardingCompleted && data.seniorCreated)) return;
    setStep(Math.min(data.onboarding.stepIndex, ONBOARDING_STEPS.length - 1));
    // intentionally once per ready load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const patch = useCallback(
    (partial: Partial<SeniorProfile>) => {
      const next: Partial<SeniorProfile> = { ...partial };
      const filledBy = next.filledBy ?? data.senior.filledBy;
      const relationship = next.relationship ?? data.senior.relationship;
      if (
        (next.filledBy != null || next.relationship != null) &&
        isSelfApplicant({ filledBy, relationship })
      ) {
        next.seniorParticipates = next.seniorParticipates || "yes";
        next.hasAuthorization = next.hasAuthorization || "yes";
      }
      updateSeniorDraft(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    },
    [updateSeniorDraft, data.senior.filledBy, data.senior.relationship],
  );

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, index));
      setStep(next);
      setOnboardingStep(next);
      setErrors({});
    },
    [setOnboardingStep],
  );

  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;

  const validate = (index: number): boolean => {
    const e: Record<string, string> = {};
    const id = ONBOARDING_STEPS[index].id;

    if (id === "relationship") {
      if (!draft.filledBy) e.filledBy = "Please tell us who is filling this profile.";
      if (!draft.relationship) e.relationship = "Please select your relationship.";
      if (!draft.seniorParticipates) e.seniorParticipates = "Please answer this question.";
      if (!draft.hasAuthorization) e.hasAuthorization = "Please answer this question.";
    }
    if (id === "personal") {
      if (!draft.firstName.trim()) e.firstName = "First name is required.";
      if (!draft.lastName.trim()) e.lastName = "Last name is required.";
    }
    if (id === "living") {
      if (!draft.livingSituation) e.livingSituation = "Please select a current situation.";
      if (draft.livingSituation === "other" && !draft.livingSituationOther.trim()) {
        e.livingSituationOther = "Please describe the situation.";
      }
    }
    if (id === "housing") {
      if (!draft.housingTypes.length) e.housingTypes = "Select at least one option (or Not sure yet).";
    }
    if (id === "urgency") {
      if (!draft.urgency) e.urgency = "Please choose a timeline.";
    }
    if (id === "location") {
      const hasZone = draft.searchZones.some((z) => z.query.trim());
      if (!hasZone) e.searchZones = "Add at least one city or ZIP code.";
    }
    if (id === "budget") {
      if (!draft.budgetUnsure) {
        const hasRange = draft.budgetMin.trim() && draft.budgetMax.trim();
        const hasFunding = draft.fundingModes.length > 0;
        if (!hasRange && !hasFunding) {
          e.budget =
            "Enter a budget range, choose funding options, or select “I’m not sure”.";
        }
        if (hasRange && Number(draft.budgetMin) > Number(draft.budgetMax)) {
          e.budget = "Minimum budget cannot be higher than maximum.";
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const continueNext = () => {
    if (!validate(step)) return;
    goTo(step + 1);
  };

  const saveAndExit = () => {
    setOnboardingStep(step);
    router.push("/family/dashboard");
  };

  const toggleHousing = (id: string) => {
    let next = draft.housingTypes.includes(id)
      ? draft.housingTypes.filter((x) => x !== id)
      : [...draft.housingTypes, id];
    if (id === "unsure") next = ["unsure"];
    else next = next.filter((x) => x !== "unsure");
    patch({ housingTypes: next });
  };

  const toggleFunding = (id: string) => {
    let next = draft.fundingModes.includes(id)
      ? draft.fundingModes.filter((x) => x !== id)
      : [...draft.fundingModes, id];
    if (id === "unsure") next = ["unsure"];
    else next = next.filter((x) => x !== "unsure");
    patch({ fundingModes: next, budgetUnsure: id === "unsure" ? true : draft.budgetUnsure });
  };

  const updateZone = (id: string, patchZone: Partial<SearchZone>) => {
    patch({
      searchZones: draft.searchZones.map((z) => (z.id === id ? { ...z, ...patchZone } : z)),
    });
  };

  const addZone = () => {
    patch({
      searchZones: [
        ...draft.searchZones,
        { id: `z${Date.now()}`, query: "", radiusMiles: 25 },
      ],
    });
  };

  const removeZone = (id: string) => {
    if (draft.searchZones.length <= 1) return;
    patch({ searchZones: draft.searchZones.filter((z) => z.id !== id) });
  };

  const finish = () => {
    if (submitting) return;
    for (let i = 1; i <= 7; i++) {
      if (!validate(i)) {
        goTo(i);
        return;
      }
    }
    setSubmitting(true);
    finalizeSeniorProfile();
    completeOnboarding();
    router.push("/family/dashboard");
  };

  const stepMeta = ONBOARDING_STEPS[step];

  const reviewRows = useMemo(() => {
    const name = seniorDisplayName(draft) || ",";
    const age = seniorAge(draft);
    return [
      ["Filled by", draft.filledBy || ","],
      ["Relationship", draft.relationship || ","],
      ["Senior", `${name}${age ? ` · age ${age}` : ""}`],
      [
        "Current situation",
        draft.livingSituation === "other"
          ? draft.livingSituationOther
          : labelForId(LIVING_SITUATIONS, draft.livingSituation) || ",",
      ],
      [
        "Housing interest",
        draft.housingTypes.map((id) => labelForId(HOUSING_TYPES, id)).join(", ") || ",",
      ],
      ["Timeline", labelForId(URGENCY_OPTIONS, draft.urgency) || ","],
      [
        "Search areas",
        draft.searchZones
          .filter((z) => z.query.trim())
          .map((z) => `${z.query} (${z.radiusMiles === 0 ? "statewide" : `${z.radiusMiles} mi`})`)
          .join("; ") || ",",
      ],
      [
        "Budget",
        draft.budgetUnsure
          ? "I’m not sure yet"
          : draft.budgetMin && draft.budgetMax
            ? `$${draft.budgetMin} – $${draft.budgetMax} / month`
            : ",",
      ],
      [
        "Funding",
        draft.fundingModes.map((id) => labelForId(FUNDING_MODES, id)).join(", ") || ",",
      ],
    ] as [string, string][];
  }, [draft]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Badge tone="brand">Family onboarding</Badge>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={cn(
              "transition",
              savedFlash ? "text-brand" : "text-ink-faint",
            )}
          >
            {savedFlash ? "Saved" : data.onboarding.lastSavedAt ? "Autosaved" : "Changes save as you go"}
          </span>
          <Button size="sm" variant="ghost" href="/start">
            Prefer talking with Haven?
          </Button>
          <Button size="sm" variant="ghost" onClick={saveAndExit}>
            <Save size={14} /> Save and exit
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>
            Step {step + 1} of {ONBOARDING_STEPS.length}
          </span>
          <span className="font-medium text-ink">{stepMeta.title}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 hidden gap-1 sm:flex">
          {ONBOARDING_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-brand" : "bg-bg-soft",
              )}
              title={s.short}
            />
          ))}
        </div>
      </div>

      <Card className="p-6 md:p-8">
        {stepMeta.id === "intro" && (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Create a care profile</h1>
            <p className="mt-3 text-ink-muted">
              For yourself or a loved one. One calm dossier you can reuse across communities, complete
              what you know now, add more later.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: Users,
                  title: "One profile, many communities",
                  text: "Apply without retyping the same story for every facility.",
                },
                {
                  icon: CheckCircle2,
                  title: "Finish later anytime",
                  text: "Skip optional fields. Autosave keeps your place.",
                },
                {
                  icon: Lock,
                  title: "Sensitive data stays private",
                  text: "Medical and personal details are protected by default.",
                },
                {
                  icon: ShieldCheck,
                  title: "You control who sees what",
                  text: "Choose which communities receive each part of the dossier.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <item.icon size={18} />
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-ink-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stepMeta.id === "relationship" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Who is this for?</h1>
              <p className="mt-2 text-ink-muted">
                You can create a profile for yourself, or for someone in your family.
              </p>
            </div>
            {Object.keys(errors).length > 0 && (
              <AuthAlert>Please complete the required fields below.</AuthAlert>
            )}
            <Field label="Who is filling out this profile?" required error={errors.filledBy}>
              <select
                className={fieldClass}
                value={draft.filledBy}
                onChange={(e) => patch({ filledBy: e.target.value })}
              >
                <option value="">Select…</option>
                {FILLER_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Who is this profile for?"
              required
              error={errors.relationship}
            >
              <select
                className={fieldClass}
                value={draft.relationship}
                onChange={(e) => patch({ relationship: e.target.value })}
              >
                <option value="">Select…</option>
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-sm font-medium">
                Is the person seeking care involved in this search?{" "}
                <span className="text-danger">*</span>
              </p>
              {errors.seniorParticipates && (
                <p className="mt-1 text-xs text-danger">{errors.seniorParticipates}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["yes", "Yes"],
                    ["no", "No"],
                    ["sometimes", "Sometimes"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch({ seniorParticipates: v })}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-medium",
                      draft.seniorParticipates === v
                        ? "bg-brand text-white"
                        : "bg-bg-soft text-ink-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">
                Do you have power of attorney or authorization to act?{" "}
                <span className="text-danger">*</span>
              </p>
              {errors.hasAuthorization && (
                <p className="mt-1 text-xs text-danger">{errors.hasAuthorization}</p>
              )}
              <div className="mt-2">
                <YesNoUnsure
                  value={draft.hasAuthorization}
                  onChange={(v) => patch({ hasAuthorization: v })}
                />
              </div>
            </div>
          </div>
        )}

        {stepMeta.id === "personal" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Personal information</h1>
              <p className="mt-2 text-ink-muted">
                Core identity for the primary senior. You can refine details later.
              </p>
            </div>
            {Object.keys(errors).length > 0 && (
              <AuthAlert>Please complete the required fields below.</AuthAlert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required error={errors.firstName}>
                <input
                  className={fieldClass}
                  value={draft.firstName}
                  onChange={(e) => patch({ firstName: e.target.value })}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Middle name" optional>
                <input
                  className={fieldClass}
                  value={draft.middleName}
                  onChange={(e) => patch({ middleName: e.target.value })}
                />
              </Field>
              <Field label="Last name" required error={errors.lastName}>
                <input
                  className={fieldClass}
                  value={draft.lastName}
                  onChange={(e) => patch({ lastName: e.target.value })}
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Date of birth" optional>
                <input
                  type="date"
                  className={fieldClass}
                  value={draft.dateOfBirth}
                  onChange={(e) => patch({ dateOfBirth: e.target.value })}
                />
              </Field>
              <Field label="Gender" optional>
                <select
                  className={fieldClass}
                  value={draft.gender}
                  onChange={(e) => patch({ gender: e.target.value })}
                >
                  <option value="">Prefer not to say</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Primary language" optional>
                <input
                  className={fieldClass}
                  value={draft.primaryLanguage}
                  onChange={(e) => patch({ primaryLanguage: e.target.value })}
                />
              </Field>
              <Field label="Phone" optional>
                <input
                  type="tel"
                  className={fieldClass}
                  value={draft.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </Field>
              <Field label="Email" optional>
                <input
                  type="email"
                  className={fieldClass}
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Current address" optional>
              <input
                className={fieldClass}
                value={draft.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" optional>
                <input
                  className={fieldClass}
                  value={draft.city}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </Field>
              <Field label="State" optional>
                <input
                  className={fieldClass}
                  value={draft.state}
                  onChange={(e) => patch({ state: e.target.value })}
                  placeholder="e.g. NY"
                />
              </Field>
              <Field label="ZIP code" optional>
                <input
                  className={fieldClass}
                  value={draft.zip}
                  onChange={(e) => patch({ zip: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {stepMeta.id === "living" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Current situation</h1>
              <p className="mt-2 text-ink-muted">Where is the senior living today?</p>
            </div>
            {errors.livingSituation && <AuthAlert>{errors.livingSituation}</AuthAlert>}
            <div className="grid gap-2">
              {LIVING_SITUATIONS.map((opt) => (
                <ChoiceCard
                  key={opt.id}
                  selected={draft.livingSituation === opt.id}
                  onClick={() => patch({ livingSituation: opt.id })}
                  title={opt.label}
                />
              ))}
            </div>
            {draft.livingSituation === "other" && (
              <Field label="Please describe" required error={errors.livingSituationOther}>
                <input
                  className={fieldClass}
                  value={draft.livingSituationOther}
                  onChange={(e) => patch({ livingSituationOther: e.target.value })}
                />
              </Field>
            )}
          </div>
        )}

        {stepMeta.id === "housing" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Type of housing sought</h1>
              <p className="mt-2 text-ink-muted">Select all that may fit, you can change this later.</p>
            </div>
            {errors.housingTypes && <AuthAlert>{errors.housingTypes}</AuthAlert>}
            <MultiChip
              options={[...HOUSING_TYPES]}
              selected={draft.housingTypes}
              onToggle={toggleHousing}
            />
          </div>
        )}

        {stepMeta.id === "urgency" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">How soon do you need a place?</h1>
              <p className="mt-2 text-ink-muted">A timeline helps communities prioritize outreach.</p>
            </div>
            {errors.urgency && <AuthAlert>{errors.urgency}</AuthAlert>}
            <div className="grid gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <ChoiceCard
                  key={opt.id}
                  selected={draft.urgency === opt.id}
                  onClick={() => patch({ urgency: opt.id })}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
        )}

        {stepMeta.id === "location" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Where are you looking?</h1>
              <p className="mt-2 text-ink-muted">
                Add one or more cities or ZIP codes and a search radius.
              </p>
            </div>
            {errors.searchZones && <AuthAlert>{errors.searchZones}</AuthAlert>}
            <div className="space-y-4">
              {draft.searchZones.map((zone, idx) => (
                <div key={zone.id} className="rounded-2xl border border-line bg-bg-soft/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Area {idx + 1}</p>
                    {draft.searchZones.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-ink-muted hover:text-danger"
                        onClick={() => removeZone(zone.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <Field label="City or ZIP code">
                    <input
                      className={fieldClass}
                      value={zone.query}
                      onChange={(e) => updateZone(zone.id, { query: e.target.value })}
                      placeholder="e.g. Austin, TX or 78701"
                    />
                  </Field>
                  <Field label="Search radius">
                    <select
                      className={fieldClass}
                      value={zone.radiusMiles}
                      onChange={(e) =>
                        updateZone(zone.id, { radiusMiles: Number(e.target.value) })
                      }
                    >
                      {RADIUS_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addZone}>
              Add another area
            </Button>
            <Field label="Desired proximity to a family member" optional>
              <input
                className={fieldClass}
                value={draft.proximityToFamily}
                onChange={(e) => patch({ proximityToFamily: e.target.value })}
                placeholder="e.g. Within 20 minutes of my home in Brookline"
              />
            </Field>
            <div>
              <p className="text-sm font-medium">Open to moving to another state?</p>
              <div className="mt-2">
                <YesNoUnsure
                  value={draft.openToOtherStates}
                  onChange={(v) => patch({ openToOtherStates: v })}
                />
              </div>
            </div>
          </div>
        )}

        {stepMeta.id === "budget" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Initial budget</h1>
              <p className="mt-2 text-ink-muted">
                Estimates are fine. You can mark “I’m not sure” and continue.
              </p>
            </div>
            {errors.budget && <AuthAlert>{errors.budget}</AuthAlert>}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.budgetUnsure}
                onChange={(e) =>
                  patch({
                    budgetUnsure: e.target.checked,
                    fundingModes: e.target.checked
                      ? draft.fundingModes.includes("unsure")
                        ? draft.fundingModes
                        : [...draft.fundingModes.filter((x) => x !== "unsure"), "unsure"]
                      : draft.fundingModes.filter((x) => x !== "unsure"),
                  })
                }
              />
              <span className="font-medium">I’m not sure about budget yet</span>
            </label>
            {!draft.budgetUnsure && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly minimum ($)">
                  <input
                    type="number"
                    min={0}
                    className={fieldClass}
                    value={draft.budgetMin}
                    onChange={(e) => patch({ budgetMin: e.target.value })}
                    placeholder="3000"
                  />
                </Field>
                <Field label="Monthly maximum ($)">
                  <input
                    type="number"
                    min={0}
                    className={fieldClass}
                    value={draft.budgetMax}
                    onChange={(e) => patch({ budgetMax: e.target.value })}
                    placeholder="6000"
                  />
                </Field>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">Expected funding sources</p>
              <MultiChip
                options={[...FUNDING_MODES]}
                selected={draft.fundingModes}
                onToggle={toggleFunding}
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-line p-4">
              <div>
                <p className="text-sm font-medium">Home / property that could be sold?</p>
                <div className="mt-2">
                  <YesNoUnsure
                    value={draft.hasHomeEquity}
                    onChange={(v) => patch({ hasHomeEquity: v })}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Long-term care insurance?</p>
                <div className="mt-2">
                  <YesNoUnsure
                    value={draft.hasLtcInsurance}
                    onChange={(v) => patch({ hasLtcInsurance: v })}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Veterans benefits?</p>
                <div className="mt-2">
                  <YesNoUnsure
                    value={draft.hasVeteransBenefits}
                    onChange={(v) => patch({ hasVeteransBenefits: v })}
                  />
                </div>
              </div>
              <Field label="Medicaid / Medicare">
                <select
                  className={fieldClass}
                  value={draft.medicaidMedicare}
                  onChange={(e) =>
                    patch({
                      medicaidMedicare: e.target.value as SeniorProfile["medicaidMedicare"],
                    })
                  }
                >
                  <option value="">Select…</option>
                  <option value="medicaid">Medicaid</option>
                  <option value="medicare">Medicare</option>
                  <option value="both">Both</option>
                  <option value="neither">Neither</option>
                  <option value="unsure">I’m not sure</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {stepMeta.id === "review" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Review & confirm</h1>
              <p className="mt-2 text-ink-muted">
                Confirm the primary senior profile. Next you’ll describe care needs.
              </p>
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line">
              {reviewRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between"
                >
                  <span className="text-sm text-ink-muted">{label}</span>
                  <span className="text-sm font-medium text-ink sm:max-w-[60%] sm:text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              You can edit this anytime from Senior Profile. Sensitive details stay private until you
              choose to share them with a community.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <div>
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>
                <ArrowLeft size={16} /> Back
              </Button>
            ) : (
              <span />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {stepMeta.id !== "intro" && stepMeta.id !== "review" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Skip optional: still validate required; for steps with only soft reqs allow continue
                  if (stepMeta.id === "personal") {
                    if (!draft.firstName.trim() || !draft.lastName.trim()) {
                      validate(step);
                      return;
                    }
                  }
                  if (
                    stepMeta.id === "relationship" ||
                    stepMeta.id === "living" ||
                    stepMeta.id === "housing" ||
                    stepMeta.id === "urgency" ||
                    stepMeta.id === "location"
                  ) {
                    continueNext();
                    return;
                  }
                  // budget: allow skip via unsure
                  if (stepMeta.id === "budget") {
                    if (!draft.budgetUnsure && !draft.fundingModes.length && !draft.budgetMin) {
                      patch({ budgetUnsure: true, fundingModes: ["unsure"] });
                    }
                    goTo(step + 1);
                    return;
                  }
                  continueNext();
                }}
              >
                Skip optional
              </Button>
            )}
            {stepMeta.id === "intro" && (
              <Button type="button" size="lg" onClick={() => goTo(1)}>
                Begin <ArrowRight size={16} />
              </Button>
            )}
            {stepMeta.id !== "intro" && stepMeta.id !== "review" && (
              <Button type="button" size="lg" onClick={continueNext}>
                Continue <ArrowRight size={16} />
              </Button>
            )}
            {stepMeta.id === "review" && (
              <Button type="button" size="lg" disabled={submitting} onClick={finish}>
                {submitting ? "Creating profile…" : "Confirm profile"}
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth role="family">
      <OnboardingInner />
    </RequireAuth>
  );
}
