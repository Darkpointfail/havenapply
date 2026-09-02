import Link from "next/link";
import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { parseProvenanced, isConfirmedPricing } from "@/lib/provenance";
import { listPublicSites } from "@/lib/residences";

export default async function PublicCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    region?: string;
    city?: string;
    maxBudget?: string;
    autonomy?: string;
    service?: string;
    page?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const q = await searchParams;
  const page = Math.max(1, Number(q.page || 1) || 1);
  const maxBudget = q.maxBudget ? Number(q.maxBudget) : undefined;

  const result = await listPublicSites({
    q: q.q || undefined,
    region: q.region || undefined,
    city: q.city || undefined,
    maxBudget: maxBudget != null && Number.isFinite(maxBudget) ? maxBudget : undefined,
    autonomy: q.autonomy || undefined,
    service: q.service || undefined,
    page,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: q.q,
      region: q.region,
      city: q.city,
      maxBudget: q.maxBudget,
      autonomy: q.autonomy,
      service: q.service,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <section className="space-y-6">
      <div className="ha-card">
        <h1 className="ha-title">{t("catalogTitle")}</h1>
        <p className="ha-subtitle">{t("catalogHelp")}</p>

        <form
          method="get"
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="catalog-filters"
        >
          <label className="block text-sm">
            <span className="opacity-70">{t("search")}</span>
            <input
              name="q"
              defaultValue={q.q || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterRegion")}</span>
            <input
              name="region"
              defaultValue={q.region || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterCity")}</span>
            <input
              name="city"
              defaultValue={q.city || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterBudget")}</span>
            <input
              name="maxBudget"
              type="number"
              min="0"
              defaultValue={q.maxBudget || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterAutonomy")}</span>
            <input
              name="autonomy"
              defaultValue={q.autonomy || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterService")}</span>
            <input
              name="service"
              defaultValue={q.service || ""}
              className="ha-input mt-1"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="ha-btn ha-btn-primary"
            >
              {t("applyFilters")}
            </button>
            <Link
              href={`/${locale}/residences`}
              className="ha-btn ha-btn-secondary"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>

        {result.items.length === 0 ? (
          <p className="mt-6 text-sm opacity-70" data-testid="catalog-empty">
            {t("catalogEmpty")}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--line)]" data-testid="catalog-list">
            {result.items.map((site) => {
              const pricing = parseProvenanced<{
                monthlyFrom?: number;
                monthlyTo?: number;
              }>(site.pricingFact);
              const showPricing = isConfirmedPricing(pricing);

              return (
                <li key={site.id} className="py-3 text-sm">
                  <Link
                    href={`/${locale}/residences/${site.slug}`}
                    className="font-medium underline opacity-90 hover:opacity-100"
                  >
                    {site.name}
                  </Link>
                  <p className="opacity-60">
                    {[site.city, site.region].filter(Boolean).join(" · ") || t("unknownValue")}
                    {showPricing && pricing?.value?.monthlyFrom != null
                      ? ` · ${t("pricingLabel")}: ${pricing.value.monthlyFrom}${
                          pricing.value.monthlyTo != null ? `–${pricing.value.monthlyTo}` : ""
                        } $`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="opacity-60">
            {t("pageOf")} {result.page} / {totalPages} · {result.total}
          </p>
          <div className="flex gap-3">
            {page > 1 ? (
              <Link
                href={`/${locale}/residences${qs({ page: String(page - 1) })}`}
                className="underline"
              >
                {t("paginationPrev")}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/${locale}/residences${qs({ page: String(page + 1) })}`}
                className="underline"
              >
                {t("paginationNext")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
