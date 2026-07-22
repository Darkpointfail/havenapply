"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Download, Minus, Printer, Star, X } from "lucide-react";
import { ApplyButton } from "@/components/auth/ApplyButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getResidence, residences } from "@/data/residences";
import { buildCompareRows, type CompareCellTone } from "@/lib/compare-communities";
import { useFamilyData } from "@/lib/family-data";
import { cn, formatCurrency } from "@/lib/utils";

function toneClass(tone: CompareCellTone) {
  switch (tone) {
    case "best":
      return "border-success/40 bg-success-soft/50 ring-1 ring-success/20";
    case "missing":
      return "border-dashed border-line bg-bg text-ink-muted";
    case "mismatch":
      return "border-warn/40 bg-warn-soft/40";
    case "diff":
      return "border-accent/30 bg-accent-soft/30";
    default:
      return "border-line bg-surface";
  }
}

function CompareInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, setCompareIds, toggleSavedCommunity } = useFamilyData();
  const [exported, setExported] = useState(false);

  const idsFromUrl = (params.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ids =
    idsFromUrl.length > 0
      ? idsFromUrl.slice(0, 4)
      : data.compareIds.length
        ? data.compareIds.slice(0, 4)
        : data.savedFavorites.slice(0, 4).map((f) => f.communityId);

  const cols = ids.map((id) => getResidence(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof getResidence>
  >[];

  const { rows, matches } = useMemo(
    () =>
      buildCompareRows(
        cols,
        data.seniorCreated ? data.senior : null,
        data.careNeeds,
      ),
    [cols, data.senior, data.seniorCreated, data.careNeeds],
  );

  const syncUrl = (nextIds: string[]) => {
    setCompareIds(nextIds);
    const q = nextIds.length ? `?ids=${nextIds.join(",")}` : "";
    router.replace(`/family/compare${q}`);
  };

  const removeCol = (id: string) => {
    syncUrl(ids.filter((x) => x !== id));
  };

  const addCommunity = (id: string) => {
    if (ids.includes(id) || ids.length >= 4) return;
    syncUrl([...ids, id]);
  };

  const exportText = () => {
    const lines: string[] = [
      "Haven · Community comparison",
      `Generated ${new Date().toLocaleString()}`,
      "",
      `Communities: ${cols.map((c) => c.name).join(" | ")}`,
      "",
    ];
    rows.forEach((row) => {
      lines.push(`## ${row.label}`);
      row.cells.forEach((cell, i) => {
        lines.push(`- ${cols[i]?.name}: ${cell.text}${cell.hint ? ` (${cell.hint})` : ""}`);
      });
      lines.push("");
    });
    lines.push(
      "Compatibility scores are a search aid, not a guarantee of admission or clinical fit.",
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haven-compare-${ids.join("-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2000);
  };

  const availableToAdd = residences.filter((r) => !ids.includes(r.id));

  if (cols.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-xl font-semibold">Nothing to compare yet</p>
        <p className="mt-2 text-ink-muted">
          Save communities or tap Compare on search results, up to four at a time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/family/saved" variant="secondary">
            Open saved
          </Button>
          <Button href="/family/find-communities">Browse communities</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
      <div className="print:hidden">
        <PageHeader
          title="Compare communities"
          description="Side-by-side view of up to four communities. Highlights show best fits, gaps, and missing data."
          breadcrumbs={[
            { label: "Family", href: "/family/dashboard" },
            { label: "Compare" },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button href="/family/saved" variant="secondary">
                From saved
              </Button>
              {cols[0] ? (
                <Button href={`/family/apply/${cols[0].id}`}>
                  Apply on profile
                </Button>
              ) : null}
              <Button href="/family/find-communities" variant="secondary">
                Add from search
              </Button>
              <Button type="button" variant="soft" onClick={exportText}>
                <Download size={16} /> Export
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </Button>
            </div>
          }
        />
        {exported && (
          <p className="mb-4 text-sm text-success">Comparison exported as a text file.</p>
        )}

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-success/40 bg-success-soft" /> Best on
            this criterion
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-dashed border-line bg-bg" /> Missing info
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-warn/40 bg-warn-soft" /> Gap / mismatch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-accent/30 bg-accent-soft" /> Notable
            difference
          </span>
        </div>

        {ids.length < 4 && availableToAdd.length > 0 && (
          <Card className="mb-5 p-3 print:hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Add a community ({ids.length}/4)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableToAdd.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addCommunity(r.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted hover:border-brand hover:text-brand"
                >
                  + {r.name}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Print header */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-2xl font-semibold">Haven community comparison</h1>
        <p className="text-sm text-ink-muted">
          {cols.map((c) => c.name).join(" · ")} · {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div
          className="grid min-w-[720px] gap-2 print:min-w-0"
          style={{
            gridTemplateColumns: `160px repeat(${cols.length}, minmax(180px, 1fr))`,
          }}
        >
          <div className="print:hidden" />
          {cols.map((r, i) => (
            <Card key={r.id} className="relative p-3 print:shadow-none">
              <button
                type="button"
                className="absolute right-2 top-2 rounded-lg p-1 text-ink-faint hover:bg-bg-soft hover:text-ink print:hidden"
                aria-label={`Remove ${r.name}`}
                onClick={() => removeCol(r.id)}
              >
                <X size={14} />
              </button>
              <div className="relative mb-2 aspect-[16/10] overflow-hidden rounded-lg print:hidden">
                <Image src={r.image} alt="" fill className="object-cover" sizes="200px" />
              </div>
              <Link
                href={`/find-senior-living/${r.id}`}
                className="font-semibold leading-snug hover:text-brand"
              >
                {r.name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-muted">
                {r.city}, {r.state}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone="ai">{matches[i]?.score ?? ","}%</Badge>
                <Badge tone="neutral">
                  <Star size={10} className="fill-warn text-warn" /> {r.rating}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-semibold">
                {r.priceAvailable && r.priceFrom != null
                  ? `From ${formatCurrency(r.priceFrom)}`
                  : "Price N/A"}
              </p>
              <div className="mt-3 flex flex-col gap-1.5 print:hidden">
                <ApplyButton residenceId={r.id} size="sm" className="w-full">
                  Apply
                </ApplyButton>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => toggleSavedCommunity(r.id)}
                >
                  {data.savedFavorites.some((f) => f.communityId === r.id)
                    ? "Unsave"
                    : "Save"}
                </Button>
              </div>
            </Card>
          ))}

          {rows.map((row) => (
            <div key={row.id} className="contents">
              <div className="flex items-center px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {row.label}
              </div>
              {row.cells.map((cell, i) => (
                <div
                  key={`${row.id}-${i}`}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm print:rounded-none print:border-line",
                    toneClass(cell.tone),
                  )}
                >
                  {cell.text === "Yes" ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check size={14} /> Yes
                    </span>
                  ) : cell.text === "No" ? (
                    <span className="inline-flex items-center gap-1 text-ink-faint">
                      <Minus size={14} /> No
                    </span>
                  ) : (
                    <span>{cell.text}</span>
                  )}
                  {cell.tone === "best" && (
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-success">
                      Best
                    </span>
                  )}
                  {cell.tone === "missing" && (
                    <span className="mt-1 block text-[10px] font-medium text-ink-faint">
                      Missing / confirm
                    </span>
                  )}
                  {cell.hint && (
                    <p className="mt-1 text-[11px] leading-snug text-ink-muted">{cell.hint}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-ink-faint print:mt-4">
        Highlights mark the strongest value per row, missing public data, and mismatches with the
        senior profile or care needs when available. Compatibility is a search aid, not a guarantee
        of admission, clinical fit, or bed availability. Comparing {cols.length} of up to 4 ·{" "}
        {residences.length} communities in this demo.
      </p>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading comparison…
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
