"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Map as MapIcon,
  PanelLeft,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CommunitiesMap } from "@/components/residences/CommunitiesMap";
import { ResidenceCard } from "@/components/residences/ResidenceCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { residences } from "@/data/residences";
import {
  computeCompatibility,
  emptySearchFilters,
  filterResidences,
  type SearchFilters,
} from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "map" | "split";

const CARE_OPTIONS = [
  "Assisted living",
  "Memory care",
  "Nursing care",
  "Independent living",
  "Rehabilitation",
  "Respite care",
  "CCRC",
] as const;

const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Mandarin"] as const;

const BUDGET_PRESETS = [
  { label: "Any", value: null },
  { label: "Under $3,500", value: 3500 },
  { label: "Under $4,500", value: 4500 },
  { label: "Under $5,500", value: 5500 },
  { label: "Under $7,000", value: 7000 },
] as const;

const DISTANCE_PRESETS = [
  { label: "Any", value: null },
  { label: "5 mi", value: 5 },
  { label: "10 mi", value: 10 },
  { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 },
] as const;

function countActiveFilters(f: SearchFilters) {
  let n = 0;
  if (f.careTypes.length) n += 1;
  if (f.budgetMax != null) n += 1;
  if (f.maxMiles != null) n += 1;
  if (f.availability !== "any") n += 1;
  if (f.room !== "any") n += 1;
  if (f.secureMemoryCare) n += 1;
  if (f.medicaid) n += 1;
  if (f.veterans) n += 1;
  if (f.medicalServices) n += 1;
  if (f.pets) n += 1;
  if (f.languages.length) n += 1;
  if (f.minRating != null) n += 1;
  if (f.amenities) n += 1;
  if (f.specialMeals) n += 1;
  if (f.transport) n += 1;
  if (f.couples) n += 1;
  if (f.respite) n += 1;
  if (f.immediateOnly) n += 1;
  if (f.partnersOnly) n += 1;
  return n;
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-brand bg-brand-soft font-medium text-brand-strong"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export default function FindCommunitiesPage() {
  const { data } = useFamilyData();

  const [filters, setFilters] = useState<SearchFilters>(emptySearchFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<ViewMode>("split");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const matched = useMemo(() => {
    const filtered = filterResidences(residences, filters);
    return filtered
      .map((r) => ({
        residence: r,
        match: computeCompatibility(r, data.seniorCreated ? data.senior : null, data.careNeeds),
      }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [filters, data.senior, data.seniorCreated, data.careNeeds]);

  useEffect(() => {
    setVisibleCount(0);
    setLoadingMore(true);
    const first = Math.min(3, matched.length);
    const t1 = window.setTimeout(() => {
      setVisibleCount(first);
      if (matched.length <= first) setLoadingMore(false);
    }, 280);
    const t2 = window.setTimeout(() => {
      setVisibleCount(matched.length);
      setLoadingMore(false);
    }, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [matched]);

  const visible = matched.slice(0, visibleCount);
  const activeFilterCount = countActiveFilters(filters);
  const hasQueryOrFilters = Boolean(filters.query.trim()) || activeFilterCount > 0;
  const restrictiveEmpty = matched.length === 0 && activeFilterCount >= 3;

  const patch = (partial: Partial<SearchFilters>) => setFilters((prev) => ({ ...prev, ...partial }));

  const toggleCare = (care: string) => {
    setFilters((prev) => ({
      ...prev,
      careTypes: prev.careTypes.includes(care)
        ? prev.careTypes.filter((c) => c !== care)
        : [...prev.careTypes, care],
    }));
  };

  const toggleLang = (lang: string) => {
    setFilters((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const resetFilters = () => setFilters(emptySearchFilters());

  const compareLink =
    data.compareIds.length > 0
      ? `/family/compare?ids=${data.compareIds.join(",")}`
      : "/family/compare";

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
            Find Communities
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Search senior living like you would a home
          </h1>
          <p className="mt-2 text-ink-muted">
            City, state, ZIP, or community name — then refine by care, budget, and what matters for
            daily life. Compatibility scores are a search aid, not an admission guarantee.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/family/saved" variant="secondary">
            Saved
          </Button>
          <Button
            href={
              data.compareIds.length
                ? `/family/apply-multi?ids=${data.compareIds.join(",")}`
                : "/family/apply-multi"
            }
            variant="secondary"
          >
            Multi-apply
          </Button>
          <Button href={compareLink} variant="secondary">
            Compare{data.compareIds.length ? ` (${data.compareIds.length})` : ""}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-8 rounded-[1.5rem] border border-line bg-surface p-3 shadow-soft md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-bg px-4 py-3">
            <Search size={18} className="shrink-0 text-ink-faint" />
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-medium uppercase tracking-wide text-ink-faint">
                Search
              </span>
              <input
                value={filters.query}
                onChange={(e) => patch({ query: e.target.value })}
                placeholder="City, state, ZIP, or community name"
                className="mt-0.5 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
              />
            </div>
            {filters.query && (
              <button
                type="button"
                className="rounded-full p-1 text-ink-faint hover:bg-bg-soft hover:text-ink"
                onClick={() => patch({ query: "" })}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>
          <Button
            type="button"
            variant={showFilters ? "soft" : "secondary"}
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0"
          >
            <SlidersHorizontal size={16} />
            Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </Button>
          <div className="flex shrink-0 rounded-2xl border border-line bg-bg p-1">
            {(
              [
                { id: "list" as const, icon: List, label: "List" },
                { id: "map" as const, icon: MapIcon, label: "Map" },
                { id: "split" as const, icon: PanelLeft, label: "Split" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition",
                  view === id ? "bg-surface font-medium text-ink shadow-xs" : "text-ink-muted",
                )}
                aria-pressed={view === id}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Care type
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CARE_OPTIONS.map((c) => (
                  <ToggleChip
                    key={c}
                    active={filters.careTypes.includes(c)}
                    onClick={() => toggleCare(c)}
                  >
                    {c}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Monthly budget max
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  value={filters.budgetMax ?? ""}
                  onChange={(e) =>
                    patch({ budgetMax: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  {BUDGET_PRESETS.map((p) => (
                    <option key={p.label} value={p.value ?? ""}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Distance
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  value={filters.maxMiles ?? ""}
                  onChange={(e) =>
                    patch({ maxMiles: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  {DISTANCE_PRESETS.map((p) => (
                    <option key={p.label} value={p.value ?? ""}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Availability
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  value={filters.availability}
                  onChange={(e) =>
                    patch({
                      availability: e.target.value as SearchFilters["availability"],
                    })
                  }
                >
                  <option value="any">Any</option>
                  <option value="now">Available now</option>
                  <option value="waitlist">Waitlist</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Room
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  value={filters.room}
                  onChange={(e) => patch({ room: e.target.value as SearchFilters["room"] })}
                >
                  <option value="any">Any</option>
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                </select>
              </label>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                More filters
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ToggleChip
                  active={filters.secureMemoryCare}
                  onClick={() => patch({ secureMemoryCare: !filters.secureMemoryCare })}
                >
                  Secure memory care
                </ToggleChip>
                <ToggleChip
                  active={filters.medicaid}
                  onClick={() => patch({ medicaid: !filters.medicaid })}
                >
                  Accepts Medicaid
                </ToggleChip>
                <ToggleChip
                  active={filters.veterans}
                  onClick={() => patch({ veterans: !filters.veterans })}
                >
                  Veterans Benefits
                </ToggleChip>
                <ToggleChip
                  active={filters.medicalServices}
                  onClick={() => patch({ medicalServices: !filters.medicalServices })}
                >
                  Medical services
                </ToggleChip>
                <ToggleChip active={filters.pets} onClick={() => patch({ pets: !filters.pets })}>
                  Pets accepted
                </ToggleChip>
                <ToggleChip
                  active={filters.amenities}
                  onClick={() => patch({ amenities: !filters.amenities })}
                >
                  Amenities
                </ToggleChip>
                <ToggleChip
                  active={filters.specialMeals}
                  onClick={() => patch({ specialMeals: !filters.specialMeals })}
                >
                  Specialized meals
                </ToggleChip>
                <ToggleChip
                  active={filters.transport}
                  onClick={() => patch({ transport: !filters.transport })}
                >
                  Transport
                </ToggleChip>
                <ToggleChip
                  active={filters.couples}
                  onClick={() => patch({ couples: !filters.couples })}
                >
                  Couples welcome
                </ToggleChip>
                <ToggleChip
                  active={filters.respite}
                  onClick={() => patch({ respite: !filters.respite })}
                >
                  Temporary / respite
                </ToggleChip>
                <ToggleChip
                  active={filters.immediateOnly}
                  onClick={() => patch({ immediateOnly: !filters.immediateOnly })}
                >
                  Immediate availability
                </ToggleChip>
                <ToggleChip
                  active={filters.partnersOnly}
                  onClick={() => patch({ partnersOnly: !filters.partnersOnly })}
                >
                  Partners only
                </ToggleChip>
                <ToggleChip
                  active={filters.minRating === 4.5}
                  onClick={() =>
                    patch({ minRating: filters.minRating === 4.5 ? null : 4.5 })
                  }
                >
                  Rating 4.5+
                </ToggleChip>
                <ToggleChip
                  active={filters.minRating === 4}
                  onClick={() => patch({ minRating: filters.minRating === 4 ? null : 4 })}
                >
                  Rating 4.0+
                </ToggleChip>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Languages spoken
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <ToggleChip
                    key={l}
                    active={filters.languages.includes(l)}
                    onClick={() => toggleLang(l)}
                  >
                    {l}
                  </ToggleChip>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results meta */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {loadingMore && visibleCount < matched.length ? (
            <>Loading communities… showing {visible.length} of {matched.length}</>
          ) : (
            <>
              <span className="font-medium text-ink">{matched.length}</span>{" "}
              {matched.length === 1 ? "community" : "communities"}
              {hasQueryOrFilters ? " match your search" : " near the demo metro"}
            </>
          )}
        </p>
        {data.compareIds.length > 0 && (
          <Badge tone="brand">{data.compareIds.length} selected to compare</Badge>
        )}
      </div>

      {/* Empty / restrictive states */}
      {matched.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-line bg-surface px-6 py-16 text-center">
          <LayoutGrid className="mx-auto text-ink-faint" size={36} />
          <h2 className="mt-4 text-xl font-semibold">
            {restrictiveEmpty ? "Filters look too restrictive" : "No communities found"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-ink-muted">
            {restrictiveEmpty
              ? "Try removing a few requirements — especially budget, distance, and Medicaid together — or broaden care type."
              : "Try another city, ZIP, or community name. You can also clear filters to browse the full demo list."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={resetFilters}>
              Clear filters
            </Button>
            <Button href="/family/care-needs" variant="secondary">
              Update care needs
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mt-6 gap-6",
            view === "split" && "grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
            view === "list" && "block",
            view === "map" && "block",
          )}
        >
          {(view === "list" || view === "split") && (
            <div className={cn("space-y-4", view === "list" && "mx-auto max-w-3xl")}>
              {visible.map(({ residence, match }) => (
                <ResidenceCard
                  key={residence.id}
                  residence={residence}
                  match={match}
                  selected={selectedId === residence.id}
                  onSelect={() => setSelectedId(residence.id)}
                  compact={view === "split"}
                />
              ))}
              {loadingMore && (
                <div className="space-y-3" aria-hidden>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-40 animate-pulse rounded-[20px] border border-line bg-bg-soft"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {(view === "map" || view === "split") && (
            <div className={cn(view === "map" && "mx-auto max-w-5xl")}>
              <CommunitiesMap
                residences={matched.map((m) => m.residence)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className={cn(view === "split" ? "sticky top-24 min-h-[560px]" : "min-h-[520px]")}
              />
              {view === "map" && selectedId && (
                <div className="mt-4">
                  {(() => {
                    const item = matched.find((m) => m.residence.id === selectedId);
                    if (!item) return null;
                    return (
                      <ResidenceCard
                        residence={item.residence}
                        match={item.match}
                        compact
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-faint">
        Compatibility scores weigh care type, budget, location, medical needs, availability, and
        preferences from your family profile when available. They never guarantee admission, clinical
        appropriateness, or a confirmed bed. Pricing and availability can change — always verify with
        the community.
      </p>
    </div>
  );
}
