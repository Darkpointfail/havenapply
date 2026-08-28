"use client";

import { useEffect, useMemo, useState } from "react";
import { RESIDENCES, type Residence } from "@/data/family-space";
import { computeMatch } from "@/lib/family-residence-match";

type ResidencesTab = "recommended" | "all";

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

function Pill({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "neutral" | "success";
}) {
  const styles =
    tone === "success"
      ? { background: "var(--fs-success-bg)", color: "var(--fs-success)" }
      : tone === "neutral"
        ? { background: "var(--fs-subtle)", color: "var(--fs-ink-muted)" }
        : { background: "var(--fs-green-tint)", color: "var(--fs-green)" };
  return (
    <span className="fs-pill" style={{ ...styles, fontWeight: 600, fontSize: 14 }}>
      {children}
    </span>
  );
}

function BulletList({
  items,
  tone,
}: {
  items: string[];
  tone: "green" | "amber";
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
          <span
            className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: tone === "green" ? "var(--fs-green)" : "var(--fs-amber)" }}
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ResidencesBrowse({
  onOpen,
  onApply,
}: {
  onOpen: (id: string, focus?: "match" | "full") => void;
  onApply: (id: string) => void;
}) {
  const [tab, setTab] = useState<ResidencesTab>("recommended");
  const [selection, setSelection] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState("");
  const [careFilters, setCareFilters] = useState<string[]>(["Soins infirmiers", "Aide au bain"]);
  const [serviceFilters, setServiceFilters] = useState<string[]>(["Repas"]);
  const [availFilters, setAvailFilters] = useState<string[]>([]);

  const recommended = useMemo(
    () =>
      RESIDENCES.filter((r) => r.recommended)
        .map((r) => ({ residence: r, match: computeMatch(undefined, r) }))
        .sort((a, b) => b.match.score - a.match.score),
    [],
  );

  const directory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESIDENCES.filter((r) => {
      if (q && !`${r.name} ${r.city}`.toLowerCase().includes(q)) return false;
      if (availFilters.includes("Unité libre") && r.availabilityTone !== "green") return false;
      if (availFilters.includes("Liste d'attente") && !r.badge.toLowerCase().includes("attente")) {
        return false;
      }
      return true;
    });
  }, [query, availFilters]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const toggleSelection = (id: string) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="fs-serif text-[32px] leading-tight">
          Trouvez la résidence adaptée à votre proche
        </h1>
        <p className="mt-3 max-w-[760px] text-[15.5px] leading-relaxed text-[var(--fs-ink-body)]">
          Consultez l&apos;ensemble des résidences ou découvrez celles que HavenApply vous suggère
          selon les besoins, le budget et les préférences indiqués dans votre dossier.
        </p>
      </div>

      <div
        className="inline-flex w-fit gap-1 rounded-[10px] border border-[var(--fs-border)] bg-white p-[5px]"
        role="tablist"
        aria-label="Modes de recherche"
      >
        {(
          [
            ["recommended", "Recommandées pour votre proche"],
            ["all", "Toutes les résidences"],
          ] as const
        ).map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="rounded-[7px] px-4 py-2.5 text-[14.5px] font-medium transition-colors"
              style={{
                background: active ? "var(--fs-black-soft)" : "transparent",
                color: active ? "#fff" : "var(--fs-ink-muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "recommended" ? (
        <div className="flex flex-col gap-5">
          <div
            className="max-w-[900px] rounded-[10px] px-4 py-3.5 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]"
            style={{
              background: "var(--fs-green-tint-2)",
              border: "1px solid var(--fs-green-line)",
            }}
          >
            Ces recommandations sont calculées à partir du profil de votre proche. Vous gardez
            toujours le contrôle sur les résidences auxquelles vous souhaitez transmettre une
            demande.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14.5px] text-[var(--fs-ink-muted)]">
              {recommended.length} recommandations personnalisées parmi 180 résidences consultables
            </p>
            <p className="text-[14px] font-medium text-[var(--fs-ink)]">Trier par compatibilité</p>
          </div>

          <div className="space-y-4">
            {recommended.map(({ residence: r, match }) => {
              const selected = selection.includes(r.id);
              return (
                <article
                  key={r.id}
                  className="fs-card grid overflow-hidden md:grid-cols-[280px_1fr]"
                >
                  <PhotoBlock height={300} className="min-h-[220px] border-0 md:min-h-[300px]" />
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="fs-serif text-[23px] leading-tight">{r.name}</h2>
                        <p className="mt-1 text-[14.5px] text-[var(--fs-ink-muted)]">{r.city}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Pill>Compatibilité {match.score} %</Pill>
                        <Pill tone={r.badgeTone === "green" ? "success" : "neutral"}>{r.badge}</Pill>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="fs-label mb-3">Pourquoi elle correspond</p>
                        <BulletList items={match.why} tone="green" />
                      </div>
                      <div>
                        <p className="fs-label mb-3">Points à considérer</p>
                        <BulletList items={match.consider} tone="amber" />
                      </div>
                    </div>

                    <div
                      className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2"
                      style={{ borderColor: "var(--fs-border-faint)" }}
                    >
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
                        className="fs-btn fs-btn-outline"
                        style={{ color: "var(--fs-green)", borderColor: "var(--fs-border)" }}
                        onClick={() => onOpen(r.id, "match")}
                      >
                        Voir pourquoi elle correspond
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
                          selected
                            ? {
                                background: "var(--fs-green-tint)",
                                color: "var(--fs-green)",
                                borderColor: "transparent",
                              }
                            : undefined
                        }
                        onClick={() => toggleSelection(r.id)}
                      >
                        {selected ? "Retirer de ma sélection" : "Ajouter à ma sélection"}
                      </button>
                      {r.partner ? (
                        <button
                          type="button"
                          className="fs-btn fs-btn-primary"
                          onClick={() => onApply(r.id)}
                        >
                          Envoyer mon dossier
                        </button>
                      ) : (
                        <button type="button" className="fs-btn fs-btn-outline">
                          Coordonnées de la résidence
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fs-grid-search grid gap-6 lg:grid-cols-[290px_1fr]">
          <aside className="fs-card sticky top-[90px] h-fit p-5">
            <p className="fs-serif text-[18px]">Filtres</p>
            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Budget mensuel</p>
                <p className="text-[14.5px] font-medium">jusqu&apos;à 3 700 $</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
                  <div className="h-full w-[62%] rounded-full bg-[var(--fs-green)]" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Distance de la famille</p>
                <p className="text-[14.5px] font-medium">moins de 25 km</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
                  <div className="h-full w-[40%] rounded-full bg-[var(--fs-green)]" />
                </div>
              </div>
              <FilterPills
                label="Soins"
                options={["Soins infirmiers", "Aide au bain", "Unité de soins de mémoire"]}
                selected={careFilters}
                onToggle={(v) => toggle(careFilters, v, setCareFilters)}
              />
              <FilterPills
                label="Services"
                options={["Repas", "Transport", "Animaux acceptés"]}
                selected={serviceFilters}
                onToggle={(v) => toggle(serviceFilters, v, setServiceFilters)}
              />
              <FilterPills
                label="Disponibilité"
                options={["Unité libre", "Liste d'attente"]}
                selected={availFilters}
                onToggle={(v) => toggle(availFilters, v, setAvailFilters)}
              />
              <div className="border-t border-[var(--fs-border)] pt-4">
                <div className="flex items-start gap-2 text-[13px] text-[var(--fs-ink-muted)]">
                  <span
                    className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--fs-green)]"
                    aria-hidden
                  />
                  Information confirmée par la résidence
                </div>
                <div className="mt-2 flex items-start gap-2 text-[13px] text-[var(--fs-ink-muted)]">
                  <span
                    className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ background: "var(--fs-amber)" }}
                    aria-hidden
                  />
                  Information à vérifier
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="fs-input flex-1"
                placeholder="Rechercher par nom ou par ville"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une résidence"
              />
              <button
                type="button"
                className="fs-btn fs-btn-outline shrink-0"
                onClick={() => setShowMap((v) => !v)}
              >
                {showMap ? "Masquer la carte" : "Voir la carte"}
              </button>
            </div>

            {showMap ? <PhotoBlock height={300} className="rounded-[12px]" label="Carte du secteur" /> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14.5px] text-[var(--fs-ink-muted)]">
                180 résidences consultables · {compareIds.length} sélectionnées pour la comparaison
                (maximum 3)
              </p>
              <p className="text-[14px] font-medium">Trier par distance</p>
            </div>

            <div className="fs-card overflow-x-auto">
              <div
                className="grid min-w-[720px] items-center gap-x-[14px] border-b border-[var(--fs-border)] bg-[var(--fs-subtle)] px-4 py-3 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[var(--fs-ink-muted)]"
                style={{ gridTemplateColumns: "2.1fr 1fr 1fr 1fr 150px" }}
              >
                <span>Résidence</span>
                <span>Prix indicatif</span>
                <span>Distance</span>
                <span>Disponibilité</span>
                <span />
              </div>
              {directory.map((r) => {
                const fav = favorites.includes(r.id);
                const compared = compareIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    className="grid min-w-[720px] items-center gap-x-[14px] border-b border-[var(--fs-border-faint)] px-4 py-4 last:border-0"
                    style={{ gridTemplateColumns: "2.1fr 1fr 1fr 1fr 150px" }}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-left text-[15.5px] font-semibold text-[var(--fs-ink)] hover:underline"
                          onClick={() => onOpen(r.id, "full")}
                        >
                          {r.name}
                        </button>
                        <span
                          className="fs-pill"
                          style={{
                            background: r.partner ? "var(--fs-green-tint)" : "var(--fs-subtle)",
                            color: r.partner ? "var(--fs-green)" : "var(--fs-ink-muted)",
                            fontSize: 12.5,
                          }}
                        >
                          {r.partner ? "Partenaire" : "Non partenaire"}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--fs-ink-muted)]">
                        <span>{r.city}</span>
                        <span
                          className="inline-block h-[7px] w-[7px] rounded-full"
                          style={{
                            background: r.confirmed ? "var(--fs-green)" : "var(--fs-amber)",
                          }}
                          aria-hidden
                        />
                        <span>
                          {r.confirmed ? "Information confirmée" : "Information à vérifier"}
                        </span>
                      </p>
                    </div>
                    <span className="text-[14.5px]">{r.price.replace("/mois", "").trim()}</span>
                    <span className="text-[14.5px]">{r.distanceKm} km</span>
                    <span
                      className="text-[14.5px] font-medium"
                      style={{
                        color:
                          r.availabilityTone === "green"
                            ? "var(--fs-success)"
                            : "var(--fs-ink-muted)",
                      }}
                    >
                      {r.badge}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        className="flex h-9 w-9 items-center justify-center rounded-[7px] border border-[var(--fs-border)]"
                        style={{
                          background: fav ? "var(--fs-green-tint)" : "var(--fs-surface)",
                          color: fav ? "var(--fs-green)" : "var(--fs-ink-muted)",
                        }}
                        onClick={() => toggleFavorite(r.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                          <path d="M7 1.4l1.54 3.12 3.44.5-2.49 2.43.59 3.43L7 9.26l-3.08 1.62.59-3.43L2.02 5.02l3.44-.5L7 1.4z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="fs-btn fs-btn-outline !min-h-9 !px-3 !text-[13px]"
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
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

export function ResidenceFiche({
  residence,
  focus = "full",
  onBack,
  onApply,
}: {
  residence: Residence;
  focus?: "match" | "full";
  onBack: () => void;
  onApply: () => void;
}) {
  const match = computeMatch(undefined, residence);

  useEffect(() => {
    if (focus !== "match") return;
    const el = document.getElementById("match-detail");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus, residence.id]);

  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="fs-btn-ghost w-fit" onClick={onBack}>
        ← Retour aux résidences
      </button>

      <div className="fs-card overflow-hidden">
        <PhotoBlock height={320} className="border-0" />
        <div className="space-y-[34px] p-6 md:p-8">
          {/* 1. Résumé */}
          <section>
            <p className="fs-label mb-3">1. Résumé</p>
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
              <div className="flex flex-col items-end gap-2">
                <Pill tone="green">Compatibilité {match.score} %</Pill>
                <Pill tone={residence.badgeTone === "green" ? "success" : "neutral"}>
                  {residence.badge}
                </Pill>
              </div>
            </div>
          </section>

          {/* 2 + 3 */}
          <section
            id="match-detail"
            className="grid gap-4 md:grid-cols-2"
            style={focus === "match" ? { scrollMarginTop: 96 } : undefined}
          >
            <div className="rounded-[11px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] p-5">
              <p className="fs-label mb-3">2. Pourquoi cette résidence correspond au profil</p>
              <BulletList items={match.why} tone="green" />
            </div>
            <div className="rounded-[11px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] p-5">
              <p className="fs-label mb-3">3. Points à considérer avant de faire une demande</p>
              <BulletList items={match.consider} tone="amber" />
            </div>
          </section>

          <div
            className="rounded-[10px] px-4 py-4"
            style={{
              background: "var(--fs-green-tint-2)",
              border: "1px solid var(--fs-green-line)",
            }}
          >
            <p className="text-[15px] font-semibold text-[var(--fs-ink)]">
              Comment ce score est-il calculé ?
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
              Le score compare les renseignements de votre dossier aux caractéristiques déclarées
              par la résidence : besoins de soins, budget, emplacement, type d&apos;unité,
              disponibilité et préférences. Il constitue une aide à la décision, et non une
              garantie d&apos;admission.
            </p>
          </div>

          {/* 4 + 5 */}
          <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="fs-label mb-3">5. Types d&apos;unités et disponibilités</p>
              <div className="overflow-hidden rounded-[12px] border border-[var(--fs-border)]">
                <div
                  className="grid gap-[18px] border-b border-[var(--fs-border)] bg-[var(--fs-subtle)] px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[var(--fs-ink-muted)]"
                  style={{ gridTemplateColumns: "1.2fr 0.8fr 1.1fr 1.2fr" }}
                >
                  <span>Type</span>
                  <span>Superficie</span>
                  <span>Prix indicatif</span>
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
              <p className="fs-label mb-3">4. Prix et services inclus</p>
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
                {residence.partner ? (
                  <button
                    type="button"
                    className="fs-btn fs-btn-primary mt-4 w-full"
                    onClick={onApply}
                  >
                    Envoyer mon dossier
                  </button>
                ) : (
                  <button type="button" className="fs-btn fs-btn-outline mt-4 w-full">
                    Coordonnées de la résidence
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 6 + 7 */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-[var(--fs-border)] p-5">
              <p className="fs-label mb-3">6. Soins et niveau d&apos;autonomie accepté</p>
              <div className="divide-y divide-[var(--fs-border-faint)]">
                {residence.care.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-[14px] text-[var(--fs-ink-muted)]">{row.label}</span>
                    <span
                      className="text-right text-[14.5px] font-medium"
                      style={{ color: row.offered ? "var(--fs-success)" : "var(--fs-terra)" }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-[var(--fs-border)] p-5">
              <p className="fs-label mb-3">7. Emplacement et proximité de la famille</p>
              <PhotoBlock height={150} className="rounded-[10px]" label="Carte du secteur" />
              <div className="mt-4 space-y-2 text-[14.5px] text-[var(--fs-ink-body)]">
                <p>{residence.location.address}</p>
                <p>{residence.location.travel}</p>
                <p className="text-[var(--fs-ink-muted)]">{residence.location.transit}</p>
              </div>
            </div>
          </section>

          {/* 8 */}
          <section>
            <p className="fs-label mb-3">8. Photos et visite virtuelle</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {residence.photoLabels.map((label) => (
                <div key={label} className="overflow-hidden rounded-[10px]">
                  <PhotoBlock height={130} label={label} className="border-0" />
                  {label === "Visite virtuelle" ? (
                    <button type="button" className="fs-btn fs-btn-outline mt-2 w-full !min-h-10">
                      Lancer la visite
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* 9 + 10 */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-[var(--fs-border)] p-5">
              <p className="fs-label mb-3">9. Délais de réponse et liste d&apos;attente</p>
              <div className="space-y-3 text-[14.5px] text-[var(--fs-ink-body)]">
                <p>
                  <span className="text-[var(--fs-ink-muted)]">Réponse habituelle : </span>
                  {residence.responseLabel}
                </p>
                <p>
                  <span className="text-[var(--fs-ink-muted)]">Disponibilités : </span>
                  {residence.badge}
                </p>
                <p className="text-[13.5px] text-[var(--fs-ink-muted)]">{residence.waitNote}</p>
              </div>
            </div>
            <div className="rounded-[12px] border border-[var(--fs-border)] p-5">
              <p className="fs-label mb-3">10. Documents particuliers demandés</p>
              <div className="space-y-3">
                {residence.documents.map((doc) => (
                  <div key={doc.name} className="flex items-center gap-2.5 text-[14.5px]">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{
                        background: doc.inDossier ? "var(--fs-green)" : "var(--fs-terra)",
                      }}
                      aria-hidden
                    />
                    <span className="text-[var(--fs-ink)]">{doc.name}</span>
                    <span className="text-[13px] text-[var(--fs-ink-muted)]">
                      {doc.inDossier ? "au dossier" : "à fournir"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
