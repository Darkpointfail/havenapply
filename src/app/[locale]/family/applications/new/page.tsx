import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { listActiveVerifiedSites } from "@/lib/applications";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { verifySiteClaim } from "@/lib/site-claim";
import { createDraftAction } from "@/app/actions/applications";

export default async function NewApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; siteClaim?: string; siteId?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  await requireRole("FAMILY", locale);
  const t = createT(locale);
  const sites = await listActiveVerifiedSites();
  const csrfToken = await getCsrfToken();
  const q = await searchParams;

  let claimToken: string | null = null;
  let lockedSite: (typeof sites)[0] | null = null;
  let claimError: string | null = q.error || null;

  if (q.siteClaim) {
    const verified = verifySiteClaim(q.siteClaim);
    if (!verified) {
      claimError = "INVALID_SITE_CLAIM";
    } else {
      lockedSite = sites.find((s) => s.id === verified.siteId) ?? null;
      if (!lockedSite) {
        claimError = "INVALID_SITE_CLAIM";
      } else {
        claimToken = q.siteClaim;
      }
    }
  }

  const defaultSiteId = !claimToken && q.siteId ? q.siteId : undefined;

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("chooseSite")}</h1>
        <p className="mt-2 text-sm opacity-70">{t("chooseSiteHelp")}</p>
        {claimError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{claimError}</p>
        ) : null}

        {sites.length === 0 ? (
          <p className="mt-6 text-sm opacity-70">{t("noSitesAvailable")}</p>
        ) : claimToken && lockedSite ? (
          <form action={createDraftAction.bind(null, locale)} className="mt-6 space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="siteClaim" value={claimToken} />
            <div className="rounded-xl border border-[var(--line)] px-4 py-3">
              <p className="font-medium">{lockedSite.name}</p>
              <p className="text-sm opacity-60">
                {lockedSite.city ? `${lockedSite.city} · ` : ""}
                {lockedSite.organization.name}
              </p>
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("startDraft")}
            </button>
          </form>
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
                    defaultChecked={defaultSiteId ? site.id === defaultSiteId : site.id === "seed-site-1"}
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
