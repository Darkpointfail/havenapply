import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { listAdminOrganizations } from "@/lib/residences";
import { createSiteAction } from "@/app/actions/admin-catalog";

export default async function NewSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organizationId?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("ADMIN", locale);
  const t = createT(locale);
  const csrfToken = await getCsrfToken();
  const q = await searchParams;

  const orgs = await listAdminOrganizations({
    role: session.user.role,
    pageSize: 100,
  });

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("createSite")}</h1>
        <p className="mt-2 text-sm opacity-70">
          <Link href={`/${locale}/admin/sites`} className="underline">
            {t("adminSites")}
          </Link>
        </p>
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        <form action={createSiteAction.bind(null, locale)} className="mt-6 space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <label className="block text-sm">
            <span className="opacity-70">{t("adminOrgs")}</span>
            <select
              name="organizationId"
              required
              defaultValue={q.organizationId || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            >
              <option value="">—</option>
              {orgs.items.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("name")}</span>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">Slug</span>
            <input name="slug" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("address")}</span>
            <input name="addressLine1" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterCity")}</span>
            <input name="city" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("region")}</span>
            <input name="region" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("postalCode")}</span>
            <input name="postalCode" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("phone")}</span>
            <input name="phone" type="tel" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("email")}</span>
            <input name="email" type="email" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("website")}</span>
            <input name="website" type="url" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("rlsNumber")}</span>
            <input name="rlsNumber" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("descriptionEditorial")}</span>
            <textarea
              name="descriptionEditorial"
              rows={4}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("servicesHint")}</span>
            <textarea
              name="services"
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="opacity-70">{t("pricingFrom")}</span>
              <input
                name="pricingFrom"
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="opacity-70">{t("pricingTo")}</span>
              <input
                name="pricingTo"
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="opacity-70">{t("autonomy")}</span>
            <input name="autonomy" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
          >
            {t("save")}
          </button>
        </form>
      </div>
    </section>
  );
}
