"use client";

import { useState } from "react";
import { RESIDENCES, SERVICES, UNIT_TYPES, type Residence } from "@/data/family-space";

const FEATURED_IDS = ["maple-grove", "lakeside-haven", "cedar-memory"];

function PhotoBlock({
  className = "",
  height,
  label,
}: {
  className?: string;
  height?: number | string;
  label?: string;
}) {
  return (
    <div
      className={`relative flex items-end overflow-hidden ${className}`}
      style={{
        height,
        minHeight: height ?? 160,
        background: "repeating-linear-gradient(135deg, #E2F3EF 0 12px, #F7FAF9 12px 24px)",
        border: "1px solid var(--fs-border)",
      }}
    >
      {label ? (
        <span className="m-3 rounded-[6px] bg-white/90 px-2 py-1 text-[12.5px] font-medium text-[var(--fs-ink-muted)]">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "green" | "neutral";
  children: React.ReactNode;
}) {
  const style =
    tone === "green"
      ? { background: "var(--fs-success-bg)", color: "var(--fs-success)" }
      : { background: "var(--fs-subtle)", color: "var(--fs-ink-muted)" };
  return (
    <span className="fs-pill" style={style}>
      {children}
    </span>
  );
}

function FilterPills({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="fs-pill"
              style={{
                background: on ? "var(--fs-green-tint)" : "var(--fs-subtle)",
                color: on ? "var(--fs-green)" : "var(--fs-ink-muted)",
                borderColor: on ? "transparent" : "var(--fs-border)",
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ResidencesBrowse({
  onOpen,
  onApply,
}: {
  onOpen: (id: string, focus?: "match" | "full") => void;
  onApply: (id: string) => void;
}) {
  const [sector, setSector] = useState("Québec et Lévis");
  const [unitTypes, setUnitTypes] = useState<string[]>(["3½"]);
  const [services, setServices] = useState<string[]>(["Repas", "Soins infirmiers"]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const featured = FEATURED_IDS
    .map((id) => RESIDENCES.find((r) => r.id === id))
    .filter((r): r is Residence => Boolean(r));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="fs-serif text-[28px] leading-tight">Résidences</h1>
        <p className="mt-2 max-w-[640px] text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
          Consultez les résidences qui correspondent aux critères de votre proche et déposez une
          demande directement depuis son dossier.
        </p>
      </div>

      <div className="fs-grid-search grid gap-6 lg:grid-cols-[290px_1fr]">
        <aside className="fs-card sticky top-[90px] h-fit p-5">
          <p className="fs-serif text-[18px]">Critères</p>
          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Secteur</p>
              <input
                className="fs-input"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Québec et Lévis"
                aria-label="Secteur recherché"
              />
            </div>

            <FilterPills
              label="Type d'unité"
              options={[...UNIT_TYPES]}
              selected={unitTypes}
              onToggle={(v) => toggle(unitTypes, v, setUnitTypes)}
            />

            <div>
              <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Budget mensuel</p>
              <p className="text-[14.5px] font-medium">jusqu&apos;à 3 700 $</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
                <div className="h-full w-[62%] rounded-full bg-[var(--fs-green)]" />
              </div>
            </div>

            <FilterPills
              label="Services requis"
              options={[...SERVICES]}
              selected={services}
              onToggle={(v) => toggle(services, v, setServices)}
            />
          </div>

          <div className="mt-5 border-t border-[var(--fs-border)] pt-4">
            <p className="text-[13px] leading-relaxed text-[var(--fs-ink-muted)]">
              Votre dossier est déjà prêt : déposer une demande prend moins d&apos;une minute par
              résidence.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14.5px] text-[var(--fs-ink-muted)]">
              {featured.length} résidences correspondent à vos critères
            </p>
            <p className="text-[14px] font-medium text-[var(--fs-ink)]">
              Trier par disponibilité
            </p>
          </div>

          <div className="space-y-4">
            {featured.map((r) => {
              const compared = compareIds.includes(r.id);
              return (
                <article
                  key={r.id}
                  className="fs-card grid overflow-hidden sm:grid-cols-[300px_1fr]"
                >
                  <PhotoBlock height={220} className="min-h-[200px] border-0 sm:min-h-full" />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="fs-serif text-[23px] leading-tight">{r.name}</h2>
                        <p className="mt-1 text-[14.5px] text-[var(--fs-ink-muted)]">
                          {r.city} · {r.units} unités
                        </p>
                      </div>
                      <Badge tone={r.badgeTone}>{r.badge}</Badge>
                    </div>

                    <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                      {r.description}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[10px] bg-[var(--fs-subtle)] px-3.5 py-3">
                        <p className="text-[13px] text-[var(--fs-ink-muted)]">{r.unitType}</p>
                        <p className="fs-serif mt-0.5 text-[18px]">{r.price}</p>
                      </div>
                      <div className="rounded-[10px] bg-[var(--fs-subtle)] px-3.5 py-3">
                        <p className="text-[13px] text-[var(--fs-ink-muted)]">Délai de réponse</p>
                        <p className="mt-0.5 text-[15px] font-semibold">{r.responseLabel}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="fs-btn fs-btn-primary"
                        onClick={() => onApply(r.id)}
                      >
                        Déposer une demande
                      </button>
                      <button
                        type="button"
                        className="fs-btn fs-btn-outline"
                        onClick={() => onOpen(r.id, "full")}
                      >
                        Voir la résidence
                      </button>
                      <button
                        type="button"
                        className="fs-btn fs-btn-outline"
                        style={
                          compared
                            ? {
                                background: "var(--fs-green-tint)",
                                color: "var(--fs-green)",
                                borderColor: "transparent",
                              }
                            : undefined
                        }
                        onClick={() => toggleCompare(r.id)}
                      >
                        Comparer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResidenceFiche({
  residence,
  onBack,
  onApply,
}: {
  residence: Residence;
  focus?: "match" | "full";
  onBack: () => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="fs-btn-ghost w-fit" onClick={onBack}>
        ← Retour aux résultats
      </button>

      <div className="fs-card overflow-hidden">
        <PhotoBlock height={320} className="border-0" />
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[780px]">
              <h1 className="fs-serif text-[30px] leading-tight">{residence.name}</h1>
              <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                {residence.city} · {residence.units} unités · {residence.response}
              </p>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--fs-ink-body)]">
                {residence.description}
              </p>
            </div>
            <Badge tone={residence.badgeTone}>{residence.badge}</Badge>
          </div>

          <div className="fs-grid-main mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="fs-label mb-3">Types d&apos;unités</p>
              <div className="overflow-hidden rounded-[12px] border border-[var(--fs-border)]">
                <div
                  className="grid gap-[18px] border-b border-[var(--fs-border)] bg-[var(--fs-subtle)] px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[var(--fs-ink-muted)]"
                  style={{ gridTemplateColumns: "1.2fr 0.8fr 1.1fr 1.2fr" }}
                >
                  <span>Type</span>
                  <span>Superficie</span>
                  <span>Prix</span>
                  <span>Disponibilité</span>
                </div>
                {residence.unitRows.map((u) => (
                  <div
                    key={u.type}
                    className="grid gap-[18px] border-b border-[var(--fs-border-faint)] px-4 py-3 last:border-0"
                    style={{ gridTemplateColumns: "1.2fr 0.8fr 1.1fr 1.2fr" }}
                  >
                    <span className="font-semibold">{u.type}</span>
                    <span className="text-[var(--fs-ink-muted)]">{u.area}</span>
                    <span>{u.price}</span>
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          u.availabilityTone === "terra"
                            ? "var(--fs-terra)"
                            : "var(--fs-success)",
                      }}
                    >
                      {u.availability}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="fs-label mb-3">Services inclus</p>
              <div className="flex flex-wrap gap-2">
                {residence.services.map((s) => (
                  <span
                    key={s}
                    className="fs-pill"
                    style={{
                      background: "var(--fs-surface)",
                      borderColor: "var(--fs-border)",
                      color: "var(--fs-ink)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-[11px] bg-[var(--fs-subtle)] p-5">
                <p className="text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                  Votre dossier est déjà constitué. Le déposer auprès de cette résidence prend
                  moins d&apos;une minute.
                </p>
                <button
                  type="button"
                  className="fs-btn fs-btn-primary mt-4 w-full"
                  onClick={onApply}
                >
                  Déposer une demande
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
