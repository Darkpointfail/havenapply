"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SensitiveDataBanner } from "@/components/privacy/SensitiveControls";
import { useFamilyData } from "@/lib/family-data";
import {
  HOUSING_TYPES,
  LIVING_SITUATIONS,
  URGENCY_OPTIONS,
  labelForId,
  seniorAge,
  seniorDisplayName,
} from "@/lib/senior-profile";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

/** Sidebar groups: 4–5 main titles, sections as subtitles */
const PROFILE_GROUPS: { id: string; title: string; sectionIds: string[] }[] = [
  {
    id: "health",
    title: "Health",
    sectionIds: ["general", "conditions", "allergies", "vaccinations"],
  },
  {
    id: "medications",
    title: "Medications",
    sectionIds: ["medications"],
  },
  {
    id: "function",
    title: "Daily living & cognition",
    sectionIds: ["mobility", "cognitive", "care"],
  },
  {
    id: "coverage",
    title: "Insurance & coverage",
    sectionIds: ["insurance"],
  },
  {
    id: "contacts",
    title: "Emergency contacts",
    sectionIds: ["emergency"],
  },
];

export default function MedicalProfilePage() {

  const t = useT();  const {
    ready,
    data,
    completeness,
    updatePerson,
    addItem,
    updateItem,
    removeItem,
  } = useFamilyData();
  const [active, setActive] = useState(data.sections[0]?.id ?? "general");
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editingPerson, setEditingPerson] = useState(false);
  const [personDraft, setPersonDraft] = useState(data.person);
  const [savedFlash, setSavedFlash] = useState(false);

  const seniorName = seniorDisplayName(data.senior) || data.person.name;
  const age = seniorAge(data.senior) || data.person.age;

  useEffect(() => {
    if (!data.sections.find((s) => s.id === active) && data.sections[0]) {
      setActive(data.sections[0].id);
    }
  }, [data.sections, active]);

  useEffect(() => {
    setPersonDraft(data.person);
  }, [data.person]);

  const section = data.sections.find((s) => s.id === active) ?? data.sections[0];

  const flashSaved = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  };

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!section || !draft.trim()) return;
    addItem(section.id, draft);
    setDraft("");
    flashSaved();
  };

  const subtitle = [
    age ? `Age ${age}` : null,
    data.senior.relationship || data.person.relationship || null,
    data.senior.city && data.senior.state
      ? `${data.senior.city}, ${data.senior.state}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!ready || !section) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading your profile…")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
      <nav aria-label={t("Breadcrumb")} className="mb-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
          <li className="flex items-center gap-1">
            <Link href="/family/dashboard" className="hover:text-brand">
              Family
            </Link>
            <ChevronRight size={12} className="text-ink-faint" aria-hidden />
            <span className="font-medium text-ink">Senior Profile</span>
          </li>
        </ol>
      </nav>

      {/* One main title + one subtitle in the page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {seniorName || "Senior profile"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {subtitle || "Medical and care details for applications"}
            <span className="text-ink-faint">
              {" "}
              · {savedFlash ? "Saved" : "Autosave on"} · {completeness}% complete
            </span>
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="soft" onClick={() => setEditingPerson(true)}>
            <UserRound size={14} /> Edit person
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <SensitiveDataBanner />
      </div>

      {data.seniorCreated && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
          <p>
            <span className="text-ink-faint">Situation · </span>
            <span className="font-medium">
              {data.senior.livingSituation === "other"
                ? data.senior.livingSituationOther
                : labelForId(LIVING_SITUATIONS, data.senior.livingSituation) || ","}
            </span>
          </p>
          <p>
            <span className="text-ink-faint">Looking for · </span>
            <span className="font-medium">
              {data.senior.housingTypes.map((id) => labelForId(HOUSING_TYPES, id)).join(", ") ||
                ","}
            </span>
          </p>
          <p>
            <span className="text-ink-faint">Timeline · </span>
            <span className="font-medium">
              {labelForId(URGENCY_OPTIONS, data.senior.urgency) || ","}
            </span>
          </p>
        </div>
      )}

      {editingPerson && (
        <Card className="mt-3 p-4">
          <h2 className="text-sm font-semibold">Who is this profile for?</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Update the person linked to this record.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(
              [
                ["name", "Full name"],
                ["preferredName", "Preferred name"],
                ["age", "Age"],
                ["relationship", "Your relationship"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-xs font-medium text-ink-muted">{label}</span>
                <input
                  value={personDraft[key]}
                  onChange={(e) => setPersonDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-teal focus:bg-surface"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                updatePerson(personDraft);
                setEditingPerson(false);
                flashSaved();
              }}
            >
              {t("Save person")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPerson(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label={t("Profile sections")}>
          {PROFILE_GROUPS.map((group) => {
            const groupSections = group.sectionIds
              .map((id) => data.sections.find((s) => s.id === id))
              .filter(Boolean) as typeof data.sections;
            if (!groupSections.length) return null;
            const groupActive = groupSections.some((s) => s.id === active);

            return (
              <div key={group.id}>
                <p
                  className={cn(
                    "px-2 text-sm font-semibold tracking-tight",
                    groupActive ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {group.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {groupSections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActive(s.id);
                          setEditingIndex(null);
                          setDraft("");
                        }}
                        className={cn(
                          "w-full rounded-lg px-2 py-1.5 text-left text-[13px] transition",
                          active === s.id
                            ? "bg-teal-soft font-medium text-teal-deep"
                            : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                        )}
                      >
                        <span className="block leading-snug">{s.title}</span>
                        <span className="mt-0.5 block line-clamp-1 text-[11px] font-normal opacity-70">
                          {s.summary}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <Card className="p-4 md:p-5">
          <div className="border-b border-line pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {PROFILE_GROUPS.find((g) => g.sectionIds.includes(section.id))?.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              <Badge tone="teal">Live</Badge>
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">{section.summary}</p>
          </div>

          <ul className="mt-4 space-y-2">
            {section.items.map((item, index) => (
              <li
                key={`${section.id}-${index}`}
                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm"
              >
                {editingIndex === index ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-teal"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          updateItem(section.id, index, editText);
                          setEditingIndex(null);
                          flashSaved();
                        }}
                      >
                        {t("Save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>
                        {t("Cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <span>{item}</span>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
                        aria-label={t("Edit")}
                        onClick={() => {
                          setEditingIndex(index);
                          setEditText(item);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-coral-soft hover:text-coral"
                        aria-label={t("Remove")}
                        onClick={() => {
                          removeItem(section.id, index);
                          flashSaved();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {section.items.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center">
              <p className="text-sm font-medium">Nothing here yet</p>
              <p className="mt-0.5 text-xs text-ink-muted">Add the first detail below.</p>
            </div>
          )}

          <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Add to ${section.title.toLowerCase()}…`}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-teal focus:bg-surface"
            />
            <Button type="submit" size="sm" className="shrink-0">
              <Plus size={16} /> Add
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-sky-soft px-3 py-2 text-xs text-ink">
            <ShieldCheck size={16} className="shrink-0 text-sky" />
            {t("Saved on this device. Communities only see what you share when applying.")}
          </div>
        </Card>
      </div>
    </div>
  );
}
