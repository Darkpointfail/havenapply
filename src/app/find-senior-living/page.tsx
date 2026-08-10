"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { CommunitiesMap } from "@/components/residences/CommunitiesMap";
import { ResidenceCard } from "@/components/residences/ResidenceCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { residences } from "@/data/residences";
import type { Residence } from "@/data/residences";
import {
  computeCompatibility,
  emptySearchFilters,
  filterResidences,
  originFromPostalCode,
  type SearchFilters,
} from "@/lib/community-match";
import { describeFilters, parseSearchIntent } from "@/lib/assistant/search-intent";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  applicationsHrefForUser,
  compareCommunitiesHref,
  savedCommunitiesHref,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

type ViewMode = "list" | "map";

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
  if (f.postalCode.trim()) n += 1;
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
        "rounded-full border px-2.5 py-1 text-xs transition",
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
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          {t("Loading search…")}
        </div>
      }
    >
      <FindCommunitiesInner />
    </Suspense>
  );
}

function FindCommunitiesInner() {
  const { user } = useAuth();
  const { data } = useFamilyData();
  const searchParams = useSearchParams();
  const isProfessional = user?.role === "professional";
  const t = useT();

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const base = emptySearchFilters();
    const q = searchParams.get("q");
    const zip = searchParams.get("zip") || searchParams.get("postal");
    const miles = searchParams.get("miles");
    const budget = searchParams.get("budget");
    const care = searchParams.get("care");
    if (q) base.query = q;
    if (zip) base.postalCode = zip;
    if (miles) base.maxMiles = Number(miles);
    if (budget) base.budgetMax = Number(budget);
    if (care) base.careTypes = [care];
    return base;
  });
  const [ask, setAsk] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalog, setCatalog] = useState<Residence[]>(residences);
  const [catalogTotal, setCatalogTotal] = useState(residences.length);
  const [medicareCount, setMedicareCount] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogHasMore, setCatalogHasMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const pageToLoad = catalogPage;

    async function load() {
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.query.trim()) params.set("q", filters.query.trim());
        if (filters.postalCode.trim()) params.set("postal", filters.postalCode.trim());
        if (filters.maxMiles != null) params.set("miles", String(filters.maxMiles));
        if (filters.careTypes[0]) params.set("care", filters.careTypes[0]);
        if (filters.medicaid) params.set("medicaid", "1");
        if (filters.minRating != null) params.set("minRating", String(filters.minRating));
        params.set("page", String(pageToLoad));
        params.set("limit", "48");
        params.set("source", "all");

        const res = await fetch(`/api/communities?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("catalog fetch failed");
        const data = (await res.json()) as {
          items: Residence[];
          total: number;
          medicareCount: number;
          page: number;
          limit: number;
        };

        setMedicareCount(data.medicareCount || 0);
        setCatalogTotal(data.total || 0);
        setCatalogHasMore(data.page * data.limit < data.total);
        setCatalog((prev) => (pageToLoad === 1 ? data.items : [...prev, ...data.items]));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // Fall back to curated demo residences if CMS catalog is unavailable.
        if (pageToLoad === 1) {
          setCatalog(residences);
          setCatalogTotal(residences.length);
          setCatalogHasMore(false);
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [
    catalogPage,
    filters.query,
    filters.postalCode,
    filters.maxMiles,
    filters.careTypes,
    filters.medicaid,
    filters.minRating,
  ]);

  // Reset pagination whenever search filters that hit the API change.
  useEffect(() => {
    setCatalogPage(1);
  }, [
    filters.query,
    filters.postalCode,
    filters.maxMiles,
    filters.careTypes,
    filters.medicaid,
    filters.minRating,
  ]);

  const postalOrigin = useMemo(
    () =>
      filters.postalCode.trim()
        ? originFromPostalCode(filters.postalCode, catalog.length ? catalog : residences)
        : null,
    [filters.postalCode, catalog],
  );

  const matched = useMemo(() => {
    const filtered = filterResidences(catalog, filters);
    const withMatch = filtered.map((r) => ({
      residence: r,
      match: computeCompatibility(r, data.seniorCreated ? data.senior : null, data.careNeeds),
    }));
    if (filters.postalCode.trim()) {
      return withMatch;
    }
    return withMatch.sort((a, b) => b.match.score - a.match.score);
  }, [catalog, filters, data.senior, data.seniorCreated, data.careNeeds]);

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
  const hasQueryOrFilters =
    Boolean(filters.query.trim()) || Boolean(filters.postalCode.trim()) || activeFilterCount > 0;
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

  const compareLink = compareCommunitiesHref(data.compareIds);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {t("Find senior living")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("Search by postal code, city, or name, then refine by care type, budget, and distance.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {user ? (
            <>
              {!isProfessional ? (
                <Button href={savedCommunitiesHref()} variant="ghost" size="sm">
                  {t("Saved")}
                </Button>
              ) : null}
              <Button href={applicationsHrefForUser(user)} variant="ghost" size="sm">
                {isProfessional ? t("Applications") : t("My applications")}
              </Button>
            </>
          ) : (
            <>
              <Button href="/get-started" size="sm">
                {t("Build a profile")}
              </Button>
              <Button href="/sign-in" variant="ghost" size="sm">
                {t("Sign in")}
              </Button>
            </>
          )}
          <Button href={compareLink} variant="secondary" size="sm">
            {t("Compare")}
            {data.compareIds.length ? ` (${data.compareIds.length})` : ""}
          </Button>
        </div>
      </div>

      {!user ? (
        <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-soft/35 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {t("Browse freely, build a profile for better matches")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {t("You can explore communities by postal code and filters right now. Create a short profile so Haven can suggest the best residences for your loved one’s care needs, budget, and preferred area.")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button href="/get-started" size="sm">
                {t("Build a profile")}
              </Button>
              <Button href="/sign-in" size="sm" variant="secondary">
                {t("Sign in")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <form
        className="mt-4 flex flex-col gap-2 rounded-xl bg-bg-soft/80 px-3 py-2 ring-1 ring-line md:flex-row md:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ask.trim()) return;
          setFilters(parseSearchIntent(ask, filters));
        }}
      >
        <div className="flex flex-1 items-center gap-2">
          <Sparkles size={14} className="shrink-0 text-brand" />
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder={t('Ask Haven: "within 20 miles of Boston under $7,000"')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        </div>
        <Button type="submit" size="sm" variant="soft">
          {t("Apply")}
        </Button>
      </form>
      {(filters.query || filters.postalCode || filters.budgetMax || filters.maxMiles) && (
        <p className="mt-1.5 text-xs text-ink-muted">Active: {describeFilters(filters)}</p>
      )}

      {/* Search bar */}
      <div className="mt-4 rounded-xl border border-line bg-surface p-2.5 md:p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex w-full shrink-0 items-center gap-2.5 rounded-lg bg-bg px-3 py-2 md:w-[160px]">
            <span className="sr-only">Postal code</span>
            <input
              value={filters.postalCode}
              onChange={(e) => patch({ postalCode: e.target.value })}
              placeholder={t("Postal / ZIP")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
              aria-label={t("Postal or ZIP code")}
              inputMode="text"
              autoComplete="postal-code"
            />
            {filters.postalCode ? (
              <button
                type="button"
                className="rounded-full p-1 text-ink-faint hover:bg-bg-soft hover:text-ink"
                onClick={() => patch({ postalCode: "" })}
                aria-label={t("Clear postal code")}
              >
                <X size={14} />
              </button>
            ) : null}
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-bg px-3 py-2">
            <Search size={16} className="shrink-0 text-ink-faint" />
            <input
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder={t("City, community name, or keyword")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
              aria-label={t("Search")}
            />
            {filters.query && (
              <button
                type="button"
                className="rounded-full p-1 text-ink-faint hover:bg-bg-soft hover:text-ink"
                onClick={() => patch({ query: "" })}
                aria-label={t("Clear search")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <Button
            type="button"
            variant={showFilters ? "soft" : "secondary"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0"
          >
            <SlidersHorizontal size={14} />
            {t("Filters")}
            {activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </Button>
          <div className="flex shrink-0 rounded-lg border border-line bg-bg p-0.5">
            {(
              [
                { id: "list" as const, icon: LayoutGrid, label: "List" },
                { id: "map" as const, icon: MapIcon, label: "Map" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition",
                  view === id ? "bg-surface font-medium text-ink shadow-xs" : "text-ink-muted",
                )}
                aria-pressed={view === id}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
        {postalOrigin ? (
          <p className="mt-2 text-xs text-ink-muted">
            {t("Showing communities near {label}", { label: postalOrigin.label })}
            {filters.maxMiles != null ? t(" · within {miles} miles", { miles: filters.maxMiles }) : ""}.
            {!user ? t(" Build a profile to rank these by care fit.") : ""}
          </p>
        ) : filters.postalCode.trim().length >= 3 ? (
          <p className="mt-2 text-xs text-warn">
            We couldn’t pinpoint that postal code yet, try a nearby ZIP (e.g. 78731) or add a city name.
          </p>
        ) : null}

        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-line pt-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {t("Care type")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t("Postal / ZIP code")}
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand"
                  value={filters.postalCode}
                  onChange={(e) => patch({ postalCode: e.target.value })}
                  placeholder={t("e.g. 78731")}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t("Monthly budget max")}
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand"
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
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Distance
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand"
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
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Availability
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand"
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
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Room
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand"
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {t("More filters")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <ToggleChip
                  active={filters.secureMemoryCare}
                  onClick={() => patch({ secureMemoryCare: !filters.secureMemoryCare })}
                >
                  {t("Secure memory care")}
                </ToggleChip>
                <ToggleChip
                  active={filters.medicaid}
                  onClick={() => patch({ medicaid: !filters.medicaid })}
                >
                  {t("Accepts Medicaid")}
                </ToggleChip>
                <ToggleChip
                  active={filters.veterans}
                  onClick={() => patch({ veterans: !filters.veterans })}
                >
                  {t("Veterans Benefits")}
                </ToggleChip>
                <ToggleChip
                  active={filters.medicalServices}
                  onClick={() => patch({ medicalServices: !filters.medicalServices })}
                >
                  {t("Medical services")}
                </ToggleChip>
                <ToggleChip active={filters.pets} onClick={() => patch({ pets: !filters.pets })}>
                  {t("Pets accepted")}
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
                  {t("Specialized meals")}
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
                  {t("Couples welcome")}
                </ToggleChip>
                <ToggleChip
                  active={filters.respite}
                  onClick={() => patch({ respite: !filters.respite })}
                >
                  {t("Temporary / respite")}
                </ToggleChip>
                <ToggleChip
                  active={filters.immediateOnly}
                  onClick={() => patch({ immediateOnly: !filters.immediateOnly })}
                >
                  {t("Immediate availability")}
                </ToggleChip>
                <ToggleChip
                  active={filters.partnersOnly}
                  onClick={() => patch({ partnersOnly: !filters.partnersOnly })}
                >
                  {t("Partners only")}
                </ToggleChip>
                <ToggleChip
                  active={filters.minRating === 4.5}
                  onClick={() =>
                    patch({ minRating: filters.minRating === 4.5 ? null : 4.5 })
                  }
                >
                  {t("Rating 4.5+")}
                </ToggleChip>
                <ToggleChip
                  active={filters.minRating === 4}
                  onClick={() => patch({ minRating: filters.minRating === 4 ? null : 4 })}
                >
                  {t("Rating 4.0+")}
                </ToggleChip>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {t("Languages spoken")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                  {t("Clear all filters")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results meta */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          {catalogLoading && catalogPage === 1 ? (
            <>Loading Medicare catalog…</>
          ) : loadingMore && visibleCount < matched.length ? (
            <>Loading… {visible.length} of {matched.length}</>
          ) : (
            <>
              <span className="font-medium text-ink">{matched.length}</span>{" "}
              {matched.length === 1 ? "community" : "communities"}
              {hasQueryOrFilters ? t(" match your search") : ""}
              {medicareCount > 0 ? (
                <span className="text-ink-faint">
                  {" "}
                  · {medicareCount.toLocaleString()} Medicare facilities indexed
                  {catalogTotal > matched.length
                    ? ` · ${catalogTotal.toLocaleString()} match filters`
                    : ""}
                </span>
              ) : null}
            </>
          )}
        </p>
        {data.compareIds.length > 0 && (
          <Badge tone="brand">{data.compareIds.length} selected to compare</Badge>
        )}
      </div>

      {/* Empty / restrictive states */}
      {matched.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface px-5 py-12 text-center">
          <LayoutGrid className="mx-auto text-ink-faint" size={28} />
          <h2 className="mt-3 text-lg font-semibold">
            {restrictiveEmpty ? t("Filters look too restrictive") : t("No communities found")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">
            {restrictiveEmpty
              ? "Try removing a few requirements, especially budget, distance, and Medicaid together, or broaden care type."
              : "Try another city, ZIP, or community name. You can also clear filters to browse the full demo list."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" onClick={resetFilters}>
              {t("Clear filters")}
            </Button>
            {user ? (
              <Button href="/family/care-needs" variant="secondary" size="sm">
                {t("Update care needs")}
              </Button>
            ) : (
              <Button href="/get-started" variant="secondary" size="sm">
                {t("Build a profile for better matches")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {view === "list" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map(({ residence, match }) => (
                <ResidenceCard
                  key={residence.id}
                  residence={residence}
                  match={match}
                  selected={selectedId === residence.id}
                  onSelect={() => setSelectedId(residence.id)}
                />
              ))}
              {loadingMore && (
                <div className="contents" aria-hidden>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-64 animate-pulse rounded-xl border border-line bg-bg-soft"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "map" && (
            <div className="mx-auto max-w-5xl">
              <CommunitiesMap
                residences={matched.map((m) => m.residence)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="min-h-[480px]"
              />
              {selectedId && (
                <div className="mt-3 max-w-xl">
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

      {catalogHasMore || visibleCount < matched.length ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={catalogLoading}
            onClick={() => {
              if (visibleCount < matched.length) {
                setVisibleCount(matched.length);
                return;
              }
              setCatalogPage((p) => p + 1);
            }}
          >
            {catalogLoading ? "Loading…" : "Load more facilities"}
          </Button>
        </div>
      ) : null}

      <p className="mt-8 max-w-2xl text-[11px] leading-relaxed text-ink-faint">
        {t("Compatibility scores are a search aid, not an admission guarantee. Pricing and availability")}
        can change, always verify with the community.
        {medicareCount > 0
          ? ` Medicare nursing homes (${medicareCount.toLocaleString()}) are sourced from CMS Care Compare; photos and prices are not included (N/A).`
          : ""}
      </p>
    </div>
  );
}
