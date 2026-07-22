"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  GitCompare,
  Share2,
  Tag,
} from "lucide-react";
import { ApplyButton } from "@/components/auth/ApplyButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getResidence } from "@/data/residences";
import { computeCompatibility } from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import {
  FAVORITE_TAGS,
  favoriteTagLabel,
  sortedFavorites,
  type FavoriteTagId,
} from "@/lib/saved-communities";
import { cn, formatCurrency } from "@/lib/utils";

export default function SavedCommunitiesPage() {
  const {
    data,
    toggleSavedCommunity,
    updateSavedFavorite,
    reorderSavedFavorites,
    shareSavedSelection,
    toggleCompareCommunity,
    setCompareIds,
  } = useFamilyData();

  const [selected, setSelected] = useState<string[]>([]);
  const [shareFlash, setShareFlash] = useState(false);
  const [filterTag, setFilterTag] = useState<FavoriteTagId | "all">("all");

  const favorites = useMemo(() => {
    let list = sortedFavorites(data.savedFavorites);
    if (filterTag !== "all") {
      list = list.filter((f) => f.tags.includes(filterTag));
    }
    return list
      .map((fav) => {
        const residence = getResidence(fav.communityId);
        if (!residence) return null;
        return {
          fav,
          residence,
          match: computeCompatibility(
            residence,
            data.seniorCreated ? data.senior : null,
            data.careNeeds,
          ),
        };
      })
      .filter(Boolean) as {
      fav: (typeof data.savedFavorites)[number];
      residence: NonNullable<ReturnType<typeof getResidence>>;
      match: ReturnType<typeof computeCompatibility>;
    }[];
  }, [data.savedFavorites, data.senior, data.seniorCreated, data.careNeeds, filterTag]);

  const allIds = favorites.map((f) => f.residence.id);
  const compareHref =
    data.compareIds.length > 0
      ? `/family/compare?ids=${data.compareIds.join(",")}`
      : allIds.length
        ? `/family/compare?ids=${allIds.slice(0, 4).join(",")}`
        : "/family/find-communities";

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const move = (id: string, dir: -1 | 1) => {
    const ordered = sortedFavorites(data.savedFavorites).map((f) => f.communityId);
    const idx = ordered.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const next = [...ordered];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    reorderSavedFavorites(next);
  };

  const toggleTag = (communityId: string, tag: FavoriteTagId, current: FavoriteTagId[]) => {
    const tags = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    updateSavedFavorite(communityId, { tags });
  };

  const shareSelection = () => {
    const ids = selected.length ? selected : allIds;
    if (!ids.length) return;
    shareSavedSelection(ids, true);
    setShareFlash(true);
    window.setTimeout(() => setShareFlash(false), 2000);
  };

  const addSelectedToCompare = () => {
    const ids = (selected.length ? selected : allIds).slice(0, 4);
    setCompareIds(ids);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Saved Communities"
        description="Shortlist, tag, rank, and share favorites with family, then compare or apply."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Saved Communities" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/family/find-communities" variant="secondary">
              Find communities
            </Button>
            <Button href={compareHref}>
              <GitCompare size={16} /> Compare
            </Button>
          </div>
        }
      />

      {data.savedFavorites.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTag("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filterTag === "all"
                ? "border-brand bg-brand-soft text-brand-strong"
                : "border-line text-ink-muted",
            )}
          >
            All ({data.savedFavorites.length})
          </button>
          {FAVORITE_TAGS.map((t) => {
            const count = data.savedFavorites.filter((f) => f.tags.includes(t.id)).length;
            if (!count) return null;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTag(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  filterTag === t.id
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-line text-ink-muted",
                )}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-line bg-surface px-6 py-16 text-center">
          <Bookmark className="mx-auto text-ink-faint" size={36} />
          <h2 className="mt-4 text-xl font-semibold">
            {filterTag !== "all" ? "No favorites with this tag" : "No saved communities yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-ink-muted">
            {filterTag !== "all"
              ? "Try another tag, or clear the filter to see your full shortlist."
              : "Tap Save on any community while browsing. Add private notes and tags here."}
          </p>
          {filterTag !== "all" ? (
            <Button type="button" className="mt-6" variant="secondary" onClick={() => setFilterTag("all")}>
              Clear filter
            </Button>
          ) : (
            <Button href="/family/find-communities" className="mt-6">
              Browse communities
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2.5">
            <span className="text-xs text-ink-muted">
              {selected.length ? `${selected.length} selected` : "Select favorites to share or compare"}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSelected(selected.length === allIds.length ? [] : allIds)
                }
              >
                {selected.length === allIds.length ? "Clear" : "Select all"}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={shareSelection}>
                <Share2 size={14} />
                Share with family
              </Button>
              <Button type="button" size="sm" variant="soft" onClick={addSelectedToCompare}>
                <GitCompare size={14} />
                Add to compare
              </Button>
            </div>
          </div>
          {shareFlash && (
            <p className="mb-3 text-sm text-success">
              Selection marked as shared with family on this device.
            </p>
          )}

          <div className="space-y-4">
            {favorites.map(({ fav, residence, match }, index) => (
              <Card key={residence.id} className="overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[140px_1fr]">
                  <Link
                    href={`/find-senior-living/${residence.id}`}
                    className="relative min-h-[120px] bg-bg-soft"
                  >
                    <Image
                      src={residence.image}
                      alt={residence.name}
                      fill
                      className="object-cover"
                      sizes="140px"
                    />
                  </Link>
                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <label className="mt-1 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.includes(residence.id)}
                          onChange={() => toggleSelect(residence.id)}
                          className="accent-[var(--brand)]"
                        />
                        <span className="sr-only">Select {residence.name}</span>
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-ink-faint">
                            #{index + 1}
                          </span>
                          <Link
                            href={`/find-senior-living/${residence.id}`}
                            className="text-lg font-semibold tracking-tight hover:text-brand"
                          >
                            {residence.name}
                          </Link>
                          <Badge tone="ai">{match.score}% match</Badge>
                          {fav.sharedWithFamily && (
                            <Badge tone="brand">Shared with family</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {residence.city}, {residence.state} ·{" "}
                          {residence.priceAvailable && residence.priceFrom != null
                            ? `From ${formatCurrency(residence.priceFrom)}/mo`
                            : "Price unavailable"}{" "}
                          · {residence.careLevels.slice(0, 2).join(", ")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => move(residence.id, -1)}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Move down"
                          disabled={index === favorites.length - 1}
                          onClick={() => move(residence.id, 1)}
                        >
                          <ArrowDown size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        <Tag size={11} /> Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {FAVORITE_TAGS.map((t) => {
                          const on = fav.tags.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTag(residence.id, t.id, fav.tags)}
                              className={cn(
                                "rounded-full border px-2.5 py-0.5 text-[11px] transition",
                                on
                                  ? "border-brand bg-brand-soft font-medium text-brand-strong"
                                  : "border-line text-ink-muted hover:border-line-strong",
                              )}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="mt-3 block">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        Private note
                      </span>
                      <textarea
                        value={fav.note}
                        onChange={(e) =>
                          updateSavedFavorite(residence.id, { note: e.target.value })
                        }
                        rows={2}
                        placeholder="Only visible to you on this device…"
                        className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <ApplyButton residenceId={residence.id} size="sm">
                        Start Application
                      </ApplyButton>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          data.compareIds.includes(residence.id) ? "soft" : "secondary"
                        }
                        onClick={() => toggleCompareCommunity(residence.id)}
                      >
                        <GitCompare size={14} />
                        {data.compareIds.includes(residence.id)
                          ? "In compare"
                          : "Compare"}
                      </Button>
                      <Button
                        href={`/find-senior-living/${residence.id}`}
                        size="sm"
                        variant="ghost"
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => toggleSavedCommunity(residence.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    {fav.tags.length > 0 && (
                      <p className="mt-2 text-xs text-ink-faint">
                        Labeled: {fav.tags.map(favoriteTagLabel).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
