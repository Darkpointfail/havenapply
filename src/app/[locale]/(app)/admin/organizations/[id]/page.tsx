import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, siteStatusLabel, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { getAdminOrganization } from "@/lib/residences";
import { updateOrgAction } from "@/app/actions/admin-catalog";

export default async function EditOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("ADMIN", locale);
  const t = createT(locale);
  const csrfToken = await getCsrfToken();
  const q = await searchParams;

  const org = await getAdminOrganization(session.user.role, id);

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="ha-card">
        <h1 className="ha-title">{t("editOrg")}</h1>
        <p className="mt-2 text-sm opacity-70">
          <Link href={`/${locale}/admin/organizations`} className="underline">
            {t("adminOrgs")}
          </Link>
        </p>
        {q.ok ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("save")} OK</p>
        ) : null}
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        <form action={updateOrgAction.bind(null, locale, id)} className="mt-6 space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <label className="block text-sm">
            <span className="opacity-70">{t("name")}</span>
            <input
              name="name"
              required
              defaultValue={org.name}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <p className="text-sm opacity-60">Slug: {org.slug}</p>
          <label className="block text-sm">
            <span className="opacity-70">{t("legalName")}</span>
            <input
              name="legalName"
              defaultValue={org.legalName || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("phone")}</span>
            <input
              name="phone"
              type="tel"
              defaultValue={org.phone || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("email")}</span>
            <input
              name="email"
              type="email"
              defaultValue={org.email || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("website")}</span>
            <input
              name="website"
              type="url"
              defaultValue={org.website || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={org.isActive} className="rounded" />
            <span>{t("orgActive")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isVerified" type="checkbox" defaultChecked={org.isVerified} className="rounded" />
            <span>{t("orgVerified")}</span>
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
          >
            {t("save")}
          </button>
        </form>
      </div>

      <div className="ha-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("adminSites")}</h2>
          <Link
            href={`/${locale}/admin/sites/new?organizationId=${org.id}`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            {t("createSite")}
          </Link>
        </div>
        {org.sites.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">{t("catalogEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {org.sites.map((site) => (
              <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="opacity-60">
                    {site.city || t("unknownValue")} · {siteStatusLabel(locale, site.status)}
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
      </div>
    </section>
  );
}
