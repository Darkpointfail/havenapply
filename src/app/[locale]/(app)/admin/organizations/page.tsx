import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { listAdminOrganizations } from "@/lib/residences";

export default async function AdminOrganizationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("ADMIN", locale);
  const t = createT(locale);
  const q = await searchParams;
  const page = Math.max(1, Number(q.page || 1) || 1);

  const result = await listAdminOrganizations({
    role: session.user.role,
    q: q.q || undefined,
    page,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q.q, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("adminOrgs")}</h1>
            <p className="mt-2 text-sm opacity-70">
              <Link href={`/${locale}/admin`} className="underline">
                {t("adminConsole")}
              </Link>
            </p>
          </div>
          <Link
            href={`/${locale}/admin/organizations/new`}
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            {t("createOrg")}
          </Link>
        </div>

        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block flex-1 text-sm">
            <span className="opacity-70">{t("search")}</span>
            <input
              name="q"
              defaultValue={q.q || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            {t("applyFilters")}
          </button>
        </form>

        {result.items.length === 0 ? (
          <p className="mt-6 text-sm opacity-70">{t("catalogEmpty")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--line)]">
            {result.items.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="opacity-60">
                    {org.slug} · {org._count.sites} {t("adminSites").toLowerCase()}
                  </p>
                </div>
                <Link
                  href={`/${locale}/admin/organizations/${org.id}`}
                  className="underline opacity-80 hover:opacity-100"
                >
                  {t("editOrg")}
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
                href={`/${locale}/admin/organizations${qs({ page: String(page - 1) })}`}
                className="underline"
              >
                {t("paginationPrev")}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/${locale}/admin/organizations${qs({ page: String(page + 1) })}`}
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
