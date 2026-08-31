"use client";

import { useMemo, useState } from "react";
import {
  RESIDENCES,
  RPA_REGIONS,
  RPA_SOURCE,
  SERVICES,
  UNIT_TYPES,
  type Residence,
} from "@/data/family-space";
import {
  computeMatch,
  EMPTY_CARE_PROFILE,
  getMatchReadiness,
  type FamilyCareProfile,
} from "@/lib/family-residence-match";

const PAGE_SIZE = 24;

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

function residenceRegion(r: Residence): string {
  const parts = r.city.split(",");
  return parts.length > 1 ? parts.slice(1).join(",").trim() : r.city;
}

export function ResidencesBrowse({
  careProfile,
  matchReady,
  matchMissing,
  onOpen,
  onApply,
  onCompleteDossier,
}: {
  careProfile?: FamilyCareProfile;
  matchReady?: boolean;
  matchMissing?: string[];
  onOpen: (id: string, focus?: "match" | "full") => void;
  onApply: (id: string) => void;
  onCompleteDossier?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const profile = careProfile ?? EMPTY_CARE_PROFILE;
  const readiness = matchReady ?? getMatchReadiness(profile).ready;
  const missing = matchMissing ?? getMatchReadiness(profile).missing;

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = RESIDENCES.filter((r) => {
      if (region && residenceRegion(r) !== region) return false;
      if (services.length > 0 && !services.every((s) => r.services.includes(s))) return false;
      if (
        unitTypes.length > 0 &&
        !unitTypes.some((t) => r.unitRows.some((u) => u.type === t) || r.unitType === t)
      ) {
        return false;
      }
      if (!q) return true;
      const hay = `${r.name} ${r.city} ${r.location.address}`.toLowerCase();
      return hay.includes(q);
    });
    if (!readiness) {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    }
    const scored = list.map((r) => ({ r, score: computeMatch(profile, r).score }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.r);
  }, [query, region, services, unitTypes, profile, readiness]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="fs-serif text-[28px] leading-tight">Résidences</h1>
        <p className="mt-2 max-w-[640px] text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
          Parcourez le registre des RPA du Québec ({RPA_SOURCE.count.toLocaleString("fr-CA")}{" "}
          résidences actives, extraction {RPA_SOURCE.extractedOn}) et déposez une demande depuis le
          dossier de votre proche.
        </p>
        {!readiness ? (
          <div className="mt-4 rounded-[14px] border border-[var(--fs-border)] bg-[linear-gradient(135deg,#F7F3EF_0%,#FFFFFF_55%,#F3FAF8_100%)] p-5">
            <p className="fs-serif text-[22px] leading-tight">
              Remplissez le dossier pour avoir des recommandations personnalisées
            </p>
            <p className="mt-2 max-w-[640px] text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
              Les scores de correspondance s’affichent seulement lorsque les critères essentiels
              sont complétés (autonomie, secteur et budget). En attendant, vous pouvez explorer le
              registre sans ranking personnalisé.
            </p>
            {missing.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[var(--fs-ink-muted)]">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
            {onCompleteDossier ? (
              <button
                type="button"
                className="fs-btn fs-btn-primary mt-4"
                onClick={onCompleteDossier}
              >
                Compléter le dossier
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="fs-grid-search grid gap-6 lg:grid-cols-[290px_1fr]">
        <aside className="fs-card sticky top-[90px] h-fit p-5">
          <p className="fs-serif text-[18px]">Critères</p>
          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Recherche</p>
              <input
                className="fs-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Nom, ville ou adresse"
                aria-label="Recherche de résidence"
              />
            </div>

            <div>
              <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Région</p>
              <select
                className="fs-input"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                aria-label="Région"
              >
                <option value="">Tout le Québec</option>
                {RPA_REGIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <FilterPills
              label="Type d'unité"
              options={[...UNIT_TYPES]}
              selected={unitTypes}
              onToggle={(v) => {
                toggle(unitTypes, v, setUnitTypes);
                setVisible(PAGE_SIZE);
              }}
            />

            <FilterPills
              label="Services déclarés"
              options={[...SERVICES]}
              selected={services}
              onToggle={(v) => {
                toggle(services, v, setServices);
                setVisible(PAGE_SIZE);
              }}
            />
          </div>

          <div className="mt-5 border-t border-[var(--fs-border)] pt-4">
            <p className="text-[13px] leading-relaxed text-[var(--fs-ink-muted)]">
              Source : {RPA_SOURCE.label}. Les tarifs et disponibilités restent à confirmer auprès
              de chaque résidence.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14.5px] text-[var(--fs-ink-muted)]">
              {filtered.length.toLocaleString("fr-CA")} résidence
              {filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}
              {shown.length < filtered.length
                ? ` · affichage de ${shown.length.toLocaleString("fr-CA")}`
                : ""}
            </p>
            <p className="text-[14px] font-medium text-[var(--fs-ink)]">
              {readiness ? "Tri par correspondance" : "Tri alphabétique"}
            </p>
          </div>

          <div className="space-y-4">
            {shown.map((r) => {
              const match = readiness ? computeMatch(profile, r) : null;
              const scoreColor =
                match && (match.tone === "strong" || match.tone === "good")
                  ? "var(--fs-success)"
                  : match?.tone === "fair"
                    ? "var(--fs-green)"
                    : "var(--fs-terra)";
              return (
                <article
                  key={r.id}
                  className="fs-card grid overflow-hidden sm:grid-cols-[300px_1fr]"
                >
                  <PhotoBlock height={220} className="min-h-[200px] border-0 sm:min-h-full" />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="fs-serif text-[23px] leading-tight">{r.name}</h2>
                        <p className="mt-1 text-[14.5px] text-[var(--fs-ink-muted)]">
                          {r.city} · {r.units} unités
                          {r.categoryLabel ? ` · ${r.categoryLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {match ? (
                          <span
                            className="inline-flex items-baseline gap-1 rounded-full border-2 bg-white px-3 py-1"
                            style={{ borderColor: scoreColor }}
                            aria-label={`Score ${match.score}`}
                          >
                            <span
                              className="fs-serif text-[20px] leading-none"
                              style={{ color: scoreColor }}
                            >
                              {match.score}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fs-ink-muted)]">
                              /100
                            </span>
                          </span>
                        ) : null}
                        <Badge tone={r.badgeTone}>{r.badge}</Badge>
                      </div>
                    </div>

                    <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                      {match
                        ? `${match.headline} — ${match.summary}`
                        : r.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(r.highlights?.length ? r.highlights : r.services)
                        .slice(0, 5)
                        .map((s) => (
                          <span
                            key={s}
                            className="fs-pill"
                            style={{
                              background: "var(--fs-surface)",
                              borderColor: "var(--fs-border)",
                              color: "var(--fs-ink-muted)",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="fs-btn fs-btn-primary"
                        onClick={() => onApply(r.id)}
                      >
                        Appliquer
                      </button>
                      <button
                        type="button"
                        className="fs-btn fs-btn-outline"
                        onClick={() => onOpen(r.id, "match")}
                      >
                        Voir pourquoi
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {shown.length === 0 ? (
              <div className="fs-card p-8 text-center">
                <p className="fs-serif text-[20px]">Aucune résidence pour ces critères</p>
                <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                  Élargissez la région ou retirez un filtre de service.
                </p>
              </div>
            ) : null}
          </div>

          {shown.length < filtered.length ? (
            <button
              type="button"
              className="fs-btn fs-btn-outline self-center"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
            >
              Voir plus de résidences
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ResidenceFiche({
  residence,
  careProfile,
  matchReady,
  matchMissing,
  focus = "match",
  onBack,
  onApply,
  onCompleteDossier,
}: {
  residence: Residence;
  careProfile?: FamilyCareProfile;
  matchReady?: boolean;
  matchMissing?: string[];
  focus?: "match" | "full";
  onBack: () => void;
  onApply: () => void;
  onCompleteDossier?: () => void;
}) {
  const profile = careProfile ?? EMPTY_CARE_PROFILE;
  const readiness = matchReady ?? getMatchReadiness(profile).ready;
  const missing = matchMissing ?? getMatchReadiness(profile).missing;
  const match = readiness ? computeMatch(profile, residence) : null;
  const scoreColor =
    match && (match.tone === "strong" || match.tone === "good")
      ? "var(--fs-success)"
      : match?.tone === "fair"
        ? "var(--fs-green)"
        : "var(--fs-terra)";
  const matchFirst = focus !== "full";

  return (
    <div className="flex flex-col gap-4 pb-24 lg:pb-4">
      <button type="button" className="fs-btn-ghost w-fit" onClick={onBack}>
        ← Retour aux résultats
      </button>

      {/* Match panel — first visual block */}
      <section
        className="fs-card overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #F3FAF8 0%, #FFFFFF 48%, #F7F3EF 100%)",
          order: matchFirst ? 0 : 2,
        }}
      >
        {match ? (
          <div className="grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
            <div
              className="mx-auto flex h-[108px] w-[108px] flex-col items-center justify-center rounded-full border-[6px] bg-white"
              style={{ borderColor: scoreColor }}
              aria-label={`Score de correspondance ${match.score} pour cent`}
            >
              <span className="fs-serif text-[34px] leading-none" style={{ color: scoreColor }}>
                {match.score}
              </span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fs-ink-muted)]">
                / 100
              </span>
            </div>

            <div className="min-w-0 text-center md:text-left">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--fs-ink-muted)]">
                Correspondance avec votre dossier
              </p>
              <h2 className="fs-serif mt-1 text-[26px] leading-tight md:text-[30px]">
                {match.headline}
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--fs-ink-body)]">
                {match.summary}
              </p>
              {match.axes.filter((a) => a.score != null && a.weight > 0).length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {match.axes
                    .filter((a) => a.score != null && a.weight > 0)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="rounded-[10px] border border-[var(--fs-border-faint)] bg-white/70 px-3 py-2"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fs-ink-muted)]">
                            {a.label}
                          </span>
                          <span className="text-[13px] font-semibold tabular-nums">
                            {a.score}
                            <span className="font-normal text-[var(--fs-ink-muted)]">
                              {" "}
                              · {Math.round(a.weight * 100)}%
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${a.score}%`,
                              background: scoreColor,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                {match.why.slice(0, 3).map((w) => (
                  <span
                    key={w}
                    className="fs-pill"
                    style={{
                      background: "var(--fs-success-bg)",
                      color: "var(--fs-success)",
                      borderColor: "transparent",
                    }}
                  >
                    {w}
                  </span>
                ))}
                {match.consider.slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="fs-pill"
                    style={{
                      background: "#F8EFEA",
                      color: "var(--fs-terra)",
                      borderColor: "transparent",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <button type="button" className="fs-btn fs-btn-primary px-6" onClick={onApply}>
                Déposer une demande
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--fs-ink-muted)]">
              Correspondance
            </p>
            <h2 className="fs-serif mt-1 text-[26px] leading-tight md:text-[30px]">
              Remplissez le dossier pour avoir des recommandations personnalisées
            </h2>
            <p className="mt-3 max-w-[640px] text-[15.5px] leading-relaxed text-[var(--fs-ink-body)]">
              Autonomie, secteur et budget sont requis avant d’afficher un score pour cette
              résidence.
            </p>
            {missing.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[var(--fs-ink-muted)]">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {onCompleteDossier ? (
                <button
                  type="button"
                  className="fs-btn fs-btn-primary"
                  onClick={onCompleteDossier}
                >
                  Compléter le dossier
                </button>
              ) : null}
              <button type="button" className="fs-btn fs-btn-outline" onClick={onApply}>
                Appliquer sans score
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="fs-card overflow-hidden">
        <PhotoBlock height={220} className="border-0" label="Emplacement" />
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[820px]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={residence.badgeTone}>{residence.badge}</Badge>
                {residence.categoryLabel ? (
                  <span className="text-[13px] text-[var(--fs-ink-muted)]">
                    {residence.categoryLabel}
                  </span>
                ) : null}
              </div>
              <h1 className="fs-serif mt-3 text-[32px] leading-tight md:text-[36px]">
                {residence.name}
              </h1>
              <p className="mt-2 text-[15px] text-[var(--fs-ink-muted)]">
                {residence.city}
                {residence.units ? ` · ${residence.units} unités` : ""}
                {residence.phone ? ` · ${residence.phone}` : ""}
              </p>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--fs-ink-body)]">
                {residence.description}
              </p>
              <p className="mt-3 text-[14px] text-[var(--fs-ink-muted)]">
                {residence.location.address}
              </p>
            </div>
          </div>

          {residence.facts && residence.facts.length > 0 ? (
            <div className="mt-8">
              <p className="fs-label mb-3">En un coup d&apos;œil</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {residence.facts.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-[12px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] px-4 py-3"
                  >
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--fs-ink-muted)]">
                      {f.label}
                    </p>
                    <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--fs-ink)]">
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="fs-grid-main mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-6">
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
                <p className="fs-label mb-3">Soins et autonomie</p>
                <div className="space-y-2">
                  {residence.care.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--fs-border-faint)] px-3.5 py-2.5"
                    >
                      <div>
                        <p className="text-[14px] font-medium">{c.label}</p>
                        <p className="text-[13.5px] text-[var(--fs-ink-muted)]">{c.value}</p>
                      </div>
                      <span
                        className="shrink-0 text-[12.5px] font-semibold"
                        style={{ color: c.offered ? "var(--fs-success)" : "var(--fs-ink-muted)" }}
                      >
                        {c.offered ? "Oui" : "Non"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-[var(--fs-ink-muted)]">
                {residence.waitNote}
              </p>
            </div>

            <aside className="space-y-4">
              <div>
                <p className="fs-label mb-3">Services déclarés</p>
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
              </div>

              <div className="sticky top-[96px] rounded-[14px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] p-5">
                <p className="fs-serif text-[20px] leading-tight">Prêt à postuler ?</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                  Déposez le dossier de votre proche en quelques clics. La résidence reçoit une
                  demande structurée, sans formulaires redondants.
                </p>
                <button
                  type="button"
                  className="fs-btn fs-btn-primary mt-4 w-full text-[15px]"
                  onClick={onApply}
                >
                  Appliquer à cette résidence
                </button>
                {residence.phone ? (
                  <a
                    href={`tel:${residence.phone.replace(/\s/g, "")}`}
                    className="fs-btn fs-btn-outline mt-2 w-full text-center text-[14.5px]"
                  >
                    Appeler {residence.phone}
                  </a>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Mobile sticky apply */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--fs-border)] bg-white/95 p-3 backdrop-blur lg:hidden">
        <button type="button" className="fs-btn fs-btn-primary w-full" onClick={onApply}>
          {match ? `Appliquer · score ${match.score}` : "Appliquer à cette résidence"}
        </button>
      </div>
    </div>
  );
}

