"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { residences } from "@/data/residences";
import { useFamilyData } from "@/lib/family-data";
import { hasActiveSubmission } from "@/lib/family-applications";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Thin community picker for apply — not a marketplace.
 * Search by name/city, open detail or jump to apply.
 */
export default function FamilyCommunitiesPickerPage() {
  const t = useT();
  const { data } = useFamilyData();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return residences
      .filter((r) => {
        if (!query) return true;
        return `${r.name} ${r.city} ${r.state} ${r.careLevels.join(" ")}`
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 24);
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          {t("Admission workflow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {t("Choose communities")}
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          {t(
            "Send the same shared dossier to one or more communities. No browsing rabbit holes — just pick and apply.",
          )}
        </p>
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search by name or city")}
          className="w-full rounded-2xl border border-line bg-bg-soft/80 py-3.5 pl-11 pr-4 text-[15px] outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button href="/family/dossier">{t("Open resident dossier")}</Button>
        <Button href="/family/applications" variant="secondary">
          {t("My applications")}
        </Button>
      </div>

      <ul className="space-y-3">
        {results.map((r) => {
          const active = hasActiveSubmission(data.applications, r.id);
          return (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-[1.5rem] border border-line bg-surface p-3 sm:flex-row sm:items-center sm:p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-bg-soft">
                <Image src={r.image} alt="" fill className="object-cover" sizes="64px" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/find-senior-living/${r.id}`}
                  className="font-semibold text-ink hover:text-brand"
                >
                  {r.name}
                </Link>
                <p className="text-sm text-ink-muted">
                  {r.city}, {r.state} · {r.careLevels.slice(0, 2).join(", ")}
                </p>
                {active ? (
                  <p className="mt-1 text-xs font-medium text-brand">{t("Already submitted")}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  href={`/find-senior-living/${r.id}`}
                  variant="secondary"
                  size="sm"
                >
                  {t("View")}
                </Button>
                <Button
                  href={active ? `/family/applications` : `/family/apply/${r.id}`}
                  size="sm"
                  className={cn(active && "opacity-80")}
                >
                  <Send size={14} />
                  {active ? t("Track") : t("Apply")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {!results.length ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          {t("No communities match that search.")}
        </p>
      ) : null}
    </div>
  );
}
