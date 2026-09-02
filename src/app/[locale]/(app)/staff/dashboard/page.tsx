import Link from "next/link";
import { redirect } from "next/navigation";
import type { ApplicationStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { listStaffApplications } from "@/lib/applications";
import { listAccessibleSiteIds } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { staffVisibleStatuses } from "@/lib/application-status";

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function StaffDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    siteId?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole(["STAFF", "ADMIN"], locale);
  const t = createT(locale);
  const q = await searchParams;

  const statusFilter =
    q.status && staffVisibleStatuses().includes(q.status as ApplicationStatus)
      ? (q.status as ApplicationStatus)
      : undefined;
  const page = Math.max(1, Number(q.page || 1) || 1);

  const result = await listStaffApplications(session.user.id, session.user.role, {
    status: statusFilter,
    siteId: q.siteId || undefined,
    q: q.q || undefined,
    from: parseDate(q.from),
    to: parseDate(q.to),
    page,
    pageSize: 20,
  });

  const accessible = await listAccessibleSiteIds(session.user.id);
  const sites = await prisma.residenceSite.findMany({
    where:
      accessible === "ALL"
        ? { isActive: true }
        : { id: { in: accessible }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true },
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      status: q.status,
      siteId: q.siteId,
      q: q.q,
      from: q.from,
      to: q.to,
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
        <h1 className="ha-title">{t("staffDashboard")}</h1>
        <p className="ha-subtitle">
          {t("welcome")}, {session.user.name || session.user.email}
          {session.user.isDevAccount ? " · DEV" : ""}
        </p>
        <p className="mt-4">
          <Link
            href={`/${locale}/staff/members`}
            className="text-sm underline opacity-80 hover:opacity-100"
          >
            {t("manageMembers")}
          </Link>
        </p>
      </div>

      <div className="ha-card">
        <h2 className="text-lg font-semibold">{t("applications")}</h2>

        <form
          method="get"
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="staff-filters"
        >
          <label className="block text-sm">
            <span className="opacity-70">{t("search")}</span>
            <input
              name="q"
              defaultValue={q.q || ""}
              className="ha-input mt-1"
              data-testid="staff-filter-q"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterStatus")}</span>
            <select
              name="status"
              defaultValue={q.status || ""}
              className="ha-input mt-1"
              data-testid="staff-filter-status"
            >
              <option value="">{t("allStatuses")}</option>
              {staffVisibleStatuses().map((s) => (
                <option key={s} value={s}>
                  {statusLabel(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterSite")}</span>
            <select
              name="siteId"
              defaultValue={q.siteId || ""}
              className="ha-input mt-1"
              data-testid="staff-filter-site"
            >
              <option value="">{t("allSites")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` · ${s.city}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterFrom")}</span>
            <input
              type="date"
              name="from"
              defaultValue={q.from || ""}
              className="ha-input mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterTo")}</span>
            <input
              type="date"
              name="to"
              defaultValue={q.to || ""}
              className="ha-input mt-1"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="ha-btn ha-btn-primary"
            >
              {t("applyFilters")}
            </button>
            <Link
              href={`/${locale}/staff/dashboard`}
              className="ha-btn ha-btn-secondary"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>

        {result.items.length === 0 ? (
          <p className="mt-6 text-sm opacity-70" data-testid="staff-empty">
            {t("emptyStaff")}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--line)]" data-testid="staff-app-list">
            {result.items.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {app.residentPreferredName || app.family.displayName} → {app.site.name}
                  </p>
                  <p className="opacity-60">{app.publicRef}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium">
                    {statusLabel(locale, app.status)}
                  </span>
                  <Link
                    href={`/${locale}/staff/applications/${app.id}`}
                    className="underline opacity-80 hover:opacity-100"
                    data-testid={`staff-open-${app.publicRef}`}
                  >
                    {t("viewApplication")}
                  </Link>
                </div>
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
                href={`/${locale}/staff/dashboard${qs({ page: String(page - 1) })}`}
                className="underline"
              >
                {t("paginationPrev")}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/${locale}/staff/dashboard${qs({ page: String(page + 1) })}`}
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
