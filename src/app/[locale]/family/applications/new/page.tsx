import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { listActiveVerifiedSites } from "@/lib/applications";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { createDraftAction } from "@/app/actions/applications";

export default async function NewApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  await requireRole("FAMILY", locale);
  const t = createT(locale);
  const sites = await listActiveVerifiedSites();
  const csrfToken = await getCsrfToken();
  const q = await searchParams;

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("chooseSite")}</h1>
        <p className="mt-2 text-sm opacity-70">{t("chooseSiteHelp")}</p>
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        {sites.length === 0 ? (
          <p className="mt-6 text-sm opacity-70">{t("noSitesAvailable")}</p>
        ) : (
          <form action={createDraftAction.bind(null, locale)} className="mt-6 space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <fieldset className="space-y-3">
              {sites.map((site) => (
                <label
                  key={site.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
                >
                  <input
                    type="radio"
                    name="siteId"
                    value={site.id}
                    required
                    className="mt-1"
                    defaultChecked={site.id === "seed-site-1"}
                  />
                  <span>
                    <span className="block font-medium">{site.name}</span>
                    <span className="text-sm opacity-60">
                      {site.city ? `${site.city} · ` : ""}
                      {site.organization.name}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("startDraft")}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm">
          <Link href={`/${locale}/family/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
        </p>
      </div>
    </section>
  );
}
