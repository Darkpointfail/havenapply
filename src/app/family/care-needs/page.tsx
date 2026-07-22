"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Info,
  Pencil,
  Save,
} from "lucide-react";
import {
  Field,
  MultiChip,
  YesNoUnsure,
  fieldClass,
} from "@/components/onboarding/OnboardingFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useFamilyData } from "@/lib/family-data";
import {
  ADL_ACTIVITIES,
  ADL_LEVELS,
  COGNITION_OPTIONS,
  HEALTH_OPTIONS,
  MENTAL_OPTIONS,
  MOBILITY_OPTIONS,
  PREFERENCE_FIELDS,
  buildCareNeedsSummary,
  careNeedsProgress,
  type AdlActivityId,
  type AdlLevel,
  type CareNeeds,
} from "@/lib/care-needs";
import { seniorDisplayName } from "@/lib/senior-profile";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "mobility", title: "Mobility" },
  { id: "adls", title: "Daily activities" },
  { id: "medication", title: "Medication" },
  { id: "cognition", title: "Memory & cognition" },
  { id: "health", title: "General health" },
  { id: "mental", title: "Mental & behavioral" },
  { id: "preferences", title: "Personal preferences" },
  { id: "summary", title: "Search summary" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function CareNeedsPage() {
  const { ready, data, updateCareNeeds, markCareNeedsComplete } = useFamilyData();
  const care = data.careNeeds;
  const name = seniorDisplayName(data.senior) || data.person.name || "your loved one";
  const [section, setSection] = useState<SectionId>(
    care.completedAt ? "summary" : "mobility",
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [editing, setEditing] = useState(!care.completedAt);

  const progress = careNeedsProgress(care);
  const summary = useMemo(() => buildCareNeedsSummary(care), [care]);

  const patch = (partial: Partial<CareNeeds>) => {
    updateCareNeeds(partial);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const patchMed = (partial: Partial<CareNeeds["medication"]>) => {
    updateCareNeeds((prev) => ({
      ...prev,
      medication: { ...prev.medication, ...partial },
    }));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const setAdl = (id: AdlActivityId, level: AdlLevel) => {
    updateCareNeeds((prev) => ({
      ...prev,
      adls: { ...prev.adls, [id]: level },
    }));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const setPref = (id: keyof CareNeeds["preferences"], value: string) => {
    updateCareNeeds((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [id]: value },
    }));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const goNext = () => {
    const idx = SECTIONS.findIndex((s) => s.id === section);
    if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].id);
  };

  const goPrev = () => {
    const idx = SECTIONS.findIndex((s) => s.id === section);
    if (idx > 0) setSection(SECTIONS[idx - 1].id);
  };

  const finishSummary = () => {
    markCareNeedsComplete();
    setEditing(false);
    setSection("summary");
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  if (!data.seniorCreated) {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8 md:py-10">
        <PageHeader
          title="Care Needs"
          description="Describe daily support in plain language, after the senior profile is created."
          breadcrumbs={[
            { label: "Family", href: "/family/dashboard" },
            { label: "Care Needs" },
          ]}
        />
        <Card className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">Create a senior profile first</h2>
          <p className="mt-2 text-ink-muted">
            Care needs build on the primary senior dossier from onboarding.
          </p>
          <Button href="/onboarding" className="mt-6">
            Continue onboarding <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Care Needs"
        description={`Help us understand ${name}’s day-to-day support needs. This guides community search, it is not a medical diagnosis.`}
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Care Needs" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-sm", savedFlash ? "text-brand" : "text-ink-faint")}>
              {savedFlash ? "Saved" : care.updatedAt ? "Autosaved" : "Answers save as you go"}
            </span>
            {care.completedAt && !editing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing(true);
                  setSection("mobility");
                }}
              >
                <Pencil size={14} /> Edit answers
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-6 border-brand/20 bg-brand-soft/30 p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 shrink-0 text-brand" size={18} />
          <p className="text-sm text-ink-muted">
            Haven uses these answers as a <strong className="font-medium text-ink">search aid</strong>{" "}
            only. Nothing here replaces clinical assessment, nursing evaluation, or professional
            medical advice.
          </p>
        </div>
      </Card>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>Assessment progress</span>
          <span className="font-medium text-ink">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="shrink-0 lg:w-52">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!editing && care.completedAt && s.id !== "summary") {
                      setEditing(true);
                    }
                    setSection(s.id);
                  }}
                  className={cn(
                    "w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition",
                    section === s.id
                      ? "bg-brand-soft font-medium text-brand-strong"
                      : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                  )}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          {(!editing && care.completedAt) || section === "summary" ? (
            <Card className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="brand">Search aid summary</Badge>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    {summary.supportLabel}
                  </h2>
                  <p className="mt-2 max-w-2xl text-ink-muted">{summary.supportBlurb}</p>
                </div>
                {care.completedAt && (
                  <Badge tone="success">
                    <CheckCircle2 size={12} /> Saved
                  </Badge>
                )}
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <SummaryBlock title="Priority points" items={summary.priorities} />
                <SummaryBlock
                  title="Likely must-haves"
                  items={
                    summary.mustHaves.length
                      ? summary.mustHaves
                      : ["No hard filters yet, keep refining answers."]
                  }
                />
                <SummaryBlock
                  title="Preferences"
                  items={
                    summary.preferences.length
                      ? summary.preferences
                      : ["No lifestyle preferences recorded yet."]
                  }
                />
                <SummaryBlock
                  title="Still missing"
                  items={
                    summary.missing.length
                      ? summary.missing
                      : ["Core sections look filled, you can still edit anytime."]
                  }
                  tone="warn"
                />
              </div>

              <p className="mt-8 rounded-xl border border-line bg-bg-soft px-4 py-3 text-sm text-ink-muted">
                {summary.disclaimer}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {editing || !care.completedAt ? (
                  <Button onClick={finishSummary}>
                    <Save size={16} /> Save summary & continue
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing(true);
                      setSection("mobility");
                    }}
                  >
                    <Pencil size={14} /> Edit care needs
                  </Button>
                )}
                <Button href="/family/find-communities" variant="secondary">
                  Find communities <ArrowRight size={16} />
                </Button>
                <Button href="/family/dashboard" variant="ghost">
                  Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 md:p-8">
              {section === "mobility" && (
                <SectionShell
                  title="Mobility"
                  subtitle="How does the senior get around today? Select all that apply."
                >
                  <MultiChip
                    options={[...MOBILITY_OPTIONS]}
                    selected={care.mobility}
                    onToggle={(id) => patch({ mobility: toggleId(care.mobility, id) })}
                  />
                </SectionShell>
              )}

              {section === "adls" && (
                <SectionShell
                  title="Daily activities"
                  subtitle="For each activity, choose the closest level of support."
                >
                  <div className="space-y-5">
                    {ADL_ACTIVITIES.map((activity) => (
                      <div key={activity.id}>
                        <p className="text-sm font-medium">{activity.label}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ADL_LEVELS.map((level) => (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => setAdl(activity.id, level.id)}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                                care.adls[activity.id] === level.id
                                  ? "bg-brand text-white"
                                  : "bg-bg-soft text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
                              )}
                            >
                              {level.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              )}

              {section === "medication" && (
                <SectionShell
                  title="Medication"
                  subtitle="Rough answers are fine, you can attach a full list in Documents later."
                >
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium">Does the senior take medications?</p>
                      <div className="mt-2">
                        <YesNoUnsure
                          value={care.medication.takesMeds}
                          onChange={(v) => patchMed({ takesMeds: v })}
                        />
                      </div>
                    </div>
                    {care.medication.takesMeds === "yes" && (
                      <>
                        <Field label="Approximate number of medications" optional>
                          <input
                            className={fieldClass}
                            value={care.medication.approximateCount}
                            onChange={(e) => patchMed({ approximateCount: e.target.value })}
                            placeholder="e.g. 6–8"
                          />
                        </Field>
                        {(
                          [
                            ["needsReminders", "Needs reminders to take meds"],
                            ["needsAdministration", "Needs someone to administer meds"],
                            ["injections", "Requires injections"],
                            ["controlledSubstances", "Includes controlled medications"],
                            ["fullListAvailable", "A complete medication list is available"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <p className="text-sm font-medium">{label}</p>
                            <div className="mt-2">
                              <YesNoUnsure
                                value={care.medication[key]}
                                onChange={(v) => patchMed({ [key]: v })}
                              />
                            </div>
                          </div>
                        ))}
                        <Field label="Notes" optional>
                          <textarea
                            rows={3}
                            className={fieldClass}
                            value={care.medication.notes}
                            onChange={(e) => patchMed({ notes: e.target.value })}
                            placeholder="Timing, pharmacy, recent changes…"
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </SectionShell>
              )}

              {section === "cognition" && (
                <SectionShell
                  title="Memory & cognition"
                  subtitle="Select what fits. This is for matching communities, not diagnosing."
                >
                  <MultiChip
                    options={[...COGNITION_OPTIONS]}
                    selected={care.cognition}
                    onToggle={(id) => {
                      let next = toggleId(care.cognition, id);
                      if (id === "none") next = next.includes("none") ? ["none"] : next;
                      else next = next.filter((x) => x !== "none");
                      patch({ cognition: next });
                    }}
                  />
                  <Field label="Additional notes" optional>
                    <textarea
                      rows={3}
                      className={fieldClass}
                      value={care.cognitionNotes}
                      onChange={(e) => patch({ cognitionNotes: e.target.value })}
                    />
                  </Field>
                </SectionShell>
              )}

              {section === "health" && (
                <SectionShell
                  title="General health"
                  subtitle="Flag relevant supports. Details can stay brief."
                >
                  <MultiChip
                    options={[...HEALTH_OPTIONS]}
                    selected={care.health}
                    onToggle={(id) => patch({ health: toggleId(care.health, id) })}
                  />
                  <Field label="Main medical conditions" optional>
                    <textarea
                      rows={2}
                      className={fieldClass}
                      value={care.healthConditions}
                      onChange={(e) => patch({ healthConditions: e.target.value })}
                      placeholder="e.g. Hypertension, mild COPD"
                    />
                  </Field>
                  <Field label="Allergies" optional>
                    <input
                      className={fieldClass}
                      value={care.allergiesDetail}
                      onChange={(e) => patch({ allergiesDetail: e.target.value })}
                      placeholder="e.g. Penicillin, rash"
                    />
                  </Field>
                  <Field label="Other health notes" optional>
                    <textarea
                      rows={2}
                      className={fieldClass}
                      value={care.healthNotes}
                      onChange={(e) => patch({ healthNotes: e.target.value })}
                    />
                  </Field>
                </SectionShell>
              )}

              {section === "mental" && (
                <SectionShell
                  title="Mental health & behavior"
                  subtitle="Share what communities should be prepared to support."
                >
                  <MultiChip
                    options={[...MENTAL_OPTIONS]}
                    selected={care.mental}
                    onToggle={(id) => patch({ mental: toggleId(care.mental, id) })}
                  />
                  <Field label="Notes" optional>
                    <textarea
                      rows={3}
                      className={fieldClass}
                      value={care.mentalNotes}
                      onChange={(e) => patch({ mentalNotes: e.target.value })}
                    />
                  </Field>
                </SectionShell>
              )}

              {section === "preferences" && (
                <SectionShell
                  title="Personal preferences"
                  subtitle="Lifestyle fit matters as much as clinical support."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {PREFERENCE_FIELDS.map((f) => (
                      <Field key={f.id} label={f.label} optional>
                        <input
                          className={fieldClass}
                          value={care.preferences[f.id]}
                          onChange={(e) => setPref(f.id, e.target.value)}
                          placeholder={f.placeholder}
                        />
                      </Field>
                    ))}
                  </div>
                </SectionShell>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goPrev}
                  disabled={section === "mobility"}
                >
                  Back
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setSection("summary")}>
                    <ClipboardList size={14} /> View summary
                  </Button>
                  {section !== "preferences" ? (
                    <Button type="button" onClick={goNext}>
                      Continue <ArrowRight size={16} />
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => setSection("summary")}>
                      Review summary <ArrowRight size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-ink-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SummaryBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "warn" ? "border-[color:var(--warn)]/30 bg-warn-soft" : "border-line bg-bg-soft/60",
      )}
    >
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-ink-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
