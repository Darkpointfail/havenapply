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

const PAGE_SIZE = 24;

/** Web Mercator tile indices for OSM raster tiles. */
function osmTileXY(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, n };
}

/** Fractional position of the pin inside its tile (0–1). */
function osmTileFraction(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { fx: x - Math.floor(x), fy: y - Math.floor(y) };
}

/** Legal visual: OSM raster tiles + pin — not a scraped facade photo. */
function ResidenceVisual({
  residence,
  className = "",
  height,
}: {
  residence: Residence;
  className?: string;
  height?: number | string;
}) {
  const { lat, lng } = residence.location;
  const hasPin = typeof lat === "number" && typeof lng === "number";

  if (hasPin) {
    const zoom = 16;
    const { x, y } = osmTileXY(lat, lng, zoom);
    const { fx, fy } = osmTileFraction(lat, lng, zoom);
    // 2×2 mosaic centered on the pin tile
    const tiles = [
      [x - 1, y - 1],
      [x, y - 1],
      [x - 1, y],
      [x, y],
    ] as const;
    const pinLeft = ((1 + fx) / 2) * 100;
    const pinTop = ((1 + fy) / 2) * 100;
    const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

    return (
      <div
        className={`relative overflow-hidden bg-[#e6eee9] ${className}`}
        style={{ height, minHeight: height ?? 160 }}
      >
        <div
          className="absolute inset-0 grid grid-cols-2 grid-rows-2"
          aria-hidden
        >
          {tiles.map(([tx, ty]) => (
            // eslint-disable-next-line @next/next/no-img-element -- OSM raster tiles
            <img
              key={`${tx}-${ty}`}
              src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute z-[1]"
          style={{
            left: `${pinLeft}%`,
            top: `${pinTop}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="h-7 w-7 rounded-full border-[3px] border-white shadow-md"
            style={{ background: "var(--fs-green, #0F6B5C)" }}
          />
          <div
            className="mx-auto -mt-1 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent"
            style={{ borderTopColor: "var(--fs-green, #0F6B5C)" }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/55 to-transparent px-3 pb-2.5 pt-10">
          <p className="text-[12px] font-medium text-white">Emplacement sur la carte</p>
          <p className="text-[11px] text-white/90">
            ©{" "}
            <a
              className="pointer-events-auto underline"
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
            {" · "}
            <a className="pointer-events-auto underline" href={osmLink} target="_blank" rel="noreferrer">
              Agrandir
            </a>
            {" — pas une photo de l'établissement"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-end overflow-hidden ${className}`}
      style={{
        height,
        minHeight: height ?? 160,
        background:
          "linear-gradient(160deg, #D7EBE6 0%, #F3F7F6 45%, #E8F1EE 100%), repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.35) 14px 28px)",
        border: "1px solid var(--fs-border)",
      }}
    >
      <div className="m-3 max-w-[90%] rounded-[8px] bg-white/92 px-3 py-2 shadow-sm">
        <p className="text-[12px] font-semibold text-[var(--fs-ink)]">Photo à venir</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--fs-ink-muted)]">
          Emplacement : {residence.city}
        </p>
      </div>
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
  onOpen,
  onApply,
  initialQuery = "",
}: {
  onOpen: (id: string, focus?: "match" | "full") => void;
  onApply: (id: string) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [region, setRegion] = useState("");
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESIDENCES.filter((r) => {
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
  }, [query, region, services, unitTypes]);

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
            <p className="text-[14px] font-medium text-[var(--fs-ink)]">Tri alphabétique</p>
          </div>

          <div className="space-y-4">
            {shown.map((r) => {
              const compared = compareIds.includes(r.id);
              return (
                <article
                  key={r.id}
                  className="fs-card grid overflow-hidden sm:grid-cols-[300px_1fr]"
                >
                  <ResidenceVisual
                    residence={r}
                    height={220}
                    className="min-h-[200px] border-0 sm:min-h-full"
                  />
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
                        <p className="text-[13px] text-[var(--fs-ink-muted)]">Contact</p>
                        <p className="mt-0.5 text-[15px] font-semibold">{r.responseLabel}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.services.slice(0, 5).map((s) => (
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
        <ResidenceVisual residence={residence} height={320} className="border-0" />
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
              <p className="mt-3 text-[14px] text-[var(--fs-ink-muted)]">
                {residence.location.address}
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

              <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--fs-ink-muted)]">
                {residence.waitNote}
              </p>
            </div>

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
