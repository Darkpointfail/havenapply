import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { createOrgAction } from "@/app/actions/admin-catalog";

export default async function NewOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  await requireRole("ADMIN", locale);
  const t = createT(locale);
  const csrfToken = await getCsrfToken();
  const q = await searchParams;

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("createOrg")}</h1>
        <p className="mt-2 text-sm opacity-70">
          <Link href={`/${locale}/admin/organizations`} className="underline">
            {t("adminOrgs")}
          </Link>
        </p>
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        <form action={createOrgAction.bind(null, locale)} className="mt-6 space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
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
            <span className="opacity-70">{t("legalName")}</span>
            <input name="legalName" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
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
          <label className="flex items-center gap-2 text-sm">
            <input name="isVerified" type="checkbox" className="rounded" />
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
    </section>
  );
}
