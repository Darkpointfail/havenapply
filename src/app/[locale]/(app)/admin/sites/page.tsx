import Link from "next/link";
import { redirect } from "next/navigation";
import type { SiteStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, siteStatusLabel, type Locale } from "@/lib/i18n";
import { listAdminOrganizations, listAdminSites } from "@/lib/residences";

const SITE_STATUSES: SiteStatus[] = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
];

export default async function AdminSitesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    organizationId?: string;
    page?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("ADMIN", locale);
  const t = createT(locale);
  const q = await searchParams;
  const page = Math.max(1, Number(q.page || 1) || 1);

  const statusFilter =
    q.status && SITE_STATUSES.includes(q.status as SiteStatus)
      ? (q.status as SiteStatus)
      : undefined;

  const [result, orgs] = await Promise.all([
    listAdminSites({
      role: session.user.role,
      q: q.q || undefined,
      status: statusFilter,
      organizationId: q.organizationId || undefined,
      page,
      pageSize: 20,
    }),
    listAdminOrganizations({ role: session.user.role, pageSize: 100 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: q.q,
      status: q.status,
      organizationId: q.organizationId,
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ha-title">{t("adminSites")}</h1>
            <p className="mt-2 text-sm opacity-70">
              <Link href={`/${locale}/admin`} className="underline">
                {t("adminConsole")}
              </Link>
            </p>
          </div>
          <Link
            href={`/${locale}/admin/sites/new`}
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            {t("createSite")}
          </Link>
        </div>

        <form
          method="get"
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="admin-sites-filters"
        >
          <label className="block text-sm">
            <span className="opacity-70">{t("search")}</span>
            <input
              name="q"
              defaultValue={q.q || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("siteStatus")}</span>
            <select
              name="status"
              defaultValue={q.status || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            >
              <option value="">{t("allStatuses")}</option>
              {SITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {siteStatusLabel(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("adminOrgs")}</span>
            <select
              name="organizationId"
              defaultValue={q.organizationId || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {orgs.items.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
            >
              {t("applyFilters")}
            </button>
            <Link
              href={`/${locale}/admin/sites`}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>

        {result.items.length === 0 ? (
          <p className="mt-6 text-sm opacity-70">{t("catalogEmpty")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--line)]" data-testid="admin-sites-list">
            {result.items.map((site) => (
              <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="opacity-60">
                    {site.organization.name}
                    {site.city ? ` · ${site.city}` : ""} · {siteStatusLabel(locale, site.status)}
                  </p>
                </div>
                <Link
                  href={`/${locale}/admin/sites/${site.id}`}
                  className="underline opacity-80 hover:opacity-100"
                >
                  {t("editSite")}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="opacity-60">
            {t("pageOf")} {result.page} / {totalPages} · {result.total}
          </p>
          <div className="flex gap-3">
            {page > 1 ? (
              <Link
                href={`/${locale}/admin/sites${qs({ page: String(page - 1) })}`}
                className="underline"
              >
                {t("paginationPrev")}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/${locale}/admin/sites${qs({ page: String(page + 1) })}`}
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
