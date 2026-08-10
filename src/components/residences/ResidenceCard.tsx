"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, GitCompare, MapPin, Star } from "lucide-react";
import type { Residence } from "@/data/residences";
import type { CompatibilityResult } from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import { compareCommunitiesHref } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";
import { ApplyButton } from "@/components/auth/ApplyButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/locale";

function availabilityLabel(r: Residence) {
  if (r.availableNow && r.availabilityConfirmed) return { text: "Available now", tone: "success" as const };
  if (r.availableNow && !r.availabilityConfirmed)
    return { text: "Availability unconfirmed", tone: "warn" as const };
  if (r.waitingWeeks) return { text: `~${r.waitingWeeks} wk wait`, tone: "warn" as const };
  return { text: "Ask about timing", tone: "neutral" as const };
}

export function ResidenceCard({
  residence,
  match,
  selected,
  onSelect,
  compact = false,
}: {
  residence: Residence;
  match?: CompatibilityResult;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const { data, toggleSavedCommunity, toggleCompareCommunity } = useFamilyData();
  const saved = data.savedFavorites.some((f) => f.communityId === residence.id);
  const comparing = data.compareIds.includes(residence.id);
  const avail = availabilityLabel(residence);
  const compareHref = compareCommunitiesHref([
    ...data.compareIds,
    residence.id,
  ]);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl border border-line bg-surface shadow-sm texture-paper transition-all duration-300",
        selected ? "border-brand ring-1 ring-brand/20" : "hover:border-line-strong hover:shadow-card",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className={cn("relative overflow-hidden", compact ? "aspect-[2/1]" : "aspect-[16/10]")}>
        <Link
          href={`/find-senior-living/${residence.id}`}
          className="block h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {residence.image ? (
            <Image
              src={residence.image}
              alt={residence.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[linear-gradient(160deg,#e8f2f2_0%,#f3f1ec_55%,#ebe4d8_100%)] px-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Medicare
              </p>
              <p className="text-sm font-medium text-ink-muted">No photo available</p>
            </div>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge tone={avail.tone}>{avail.text}</Badge>
          {!residence.partner && <Badge tone="neutral">Non-partner</Badge>}
          {!residence.image && <Badge tone="neutral">CMS</Badge>}
          {match && <Badge tone="brand">{match.score}% match</Badge>}
        </div>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save community"}
          className={cn(
            "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-xs backdrop-blur transition",
            saved
              ? "border-brand bg-brand text-white"
              : "border-white/70 bg-white/90 text-ink-muted hover:text-brand",
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleSavedCommunity(residence.id);
          }}
        >
          <Bookmark size={16} className={saved ? "fill-current" : undefined} />
        </button>
      </div>

      <div className={cn("space-y-2.5", compact ? "p-3.5" : "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn("font-semibold tracking-tight text-ink", compact ? "text-sm" : "text-base")}>
              <Link
                href={`/find-senior-living/${residence.id}`}
                className="hover:text-brand"
                onClick={(e) => e.stopPropagation()}
              >
                {residence.name}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin size={14} className="shrink-0" />
              {residence.city}, {residence.state} {residence.zip} · {residence.distanceMiles} mi
            </p>
          </div>
          <div className="shrink-0 text-right text-sm font-medium">
            <span className="inline-flex items-center gap-1">
              <Star size={14} className="fill-warn text-warn" />
              {residence.rating}
            </span>
            <p className="text-xs font-normal text-ink-faint">{residence.reviewCount} reviews</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {residence.careLevels.slice(0, 3).map((level) => (
            <Badge key={level} tone="brand">
              {level}
            </Badge>
          ))}
        </div>

        {!compact && residence.highlights?.length > 0 && (
          <p className="line-clamp-2 text-sm text-ink-muted">{residence.highlights.join(" · ")}</p>
        )}

        {match && !compact && (
          <div className="rounded-xl bg-bg px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t("Why this may fit")}
            </p>
            <ul className="mt-1.5 space-y-1">
              {match.reasons.slice(0, 2).map((r) => (
                <li
                  key={r.text}
                  className={cn(
                    "text-xs leading-snug",
                    r.tone === "fit" && "text-success",
                    r.tone === "partial" && "text-ink-muted",
                    r.tone === "gap" && "text-warn",
                  )}
                >
                  {r.text}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] leading-snug text-ink-faint">{match.disclaimer}</p>
          </div>
        )}

        <div className="flex items-end justify-between gap-3 pt-0.5">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">From</p>
            {residence.priceAvailable && residence.priceFrom != null ? (
              <p className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
                {formatCurrency(residence.priceFrom)}
                <span className="text-sm font-normal text-ink-muted"> / mo</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-ink-muted">N/A</p>
            )}
          </div>
        </div>

        <div
          className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}
          onClick={(e) => e.stopPropagation()}
        >
          <Button href={`/find-senior-living/${residence.id}`} size="sm" variant="soft" className="w-full">
            {t("View Community")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={comparing ? "soft" : "ghost"}
            className="w-full"
            onClick={() => toggleCompareCommunity(residence.id)}
          >
            <GitCompare size={14} />
            {comparing ? "In compare" : "Compare"}
          </Button>
          {!compact && (
            <>
              <Button href={compareHref} size="sm" variant="secondary" className="w-full sm:col-span-1">
                {t("Open compare")}
              </Button>
              <ApplyButton residenceId={residence.id} size="sm" className="w-full">
                {t("Start Application")}
              </ApplyButton>
            </>
          )}
          {compact && (
            <ApplyButton residenceId={residence.id} size="sm" className="col-span-2 w-full">
              {t("Start Application")}
            </ApplyButton>
          )}
        </div>
      </div>
    </article>
  );
}
