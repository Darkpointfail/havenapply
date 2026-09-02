import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { parseProvenanced, isConfirmedPricing } from "@/lib/provenance";
import { getPublicSiteBySlug } from "@/lib/residences";
import { createSiteClaim } from "@/lib/site-claim";

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);

  const { site, redirectSlug } = await getPublicSiteBySlug(slug);
  if (redirectSlug) redirect(`/${locale}/residences/${redirectSlug}`);
  if (!site) notFound();

  const services = parseProvenanced<string[]>(site.servicesFact);
  const pricing = parseProvenanced<{
    monthlyFrom?: number;
    monthlyTo?: number;
    currency?: string;
  }>(site.pricingFact);
  const autonomy = parseProvenanced<string | string[]>(site.autonomyFact);
  const photos = parseProvenanced<Array<{ url: string; alt?: string }>>(site.photosFact);

  const photoList =
    photos?.source === "FACILITY" &&
    photos.value &&
    Array.isArray(photos.value) &&
    photos.value.length > 0
      ? photos.value.filter((p) => p?.url)
      : [];

  const claim = createSiteClaim(site.id);
  const applyHref = `/${locale}/family/applications/new?siteClaim=${encodeURIComponent(claim)}`;

  const addressParts = [
    site.addressLine1,
    site.addressLine2,
    [site.city, site.region, site.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <section className="space-y-6">
      <div className="ha-card">
        <h1 className="ha-title">{site.name}</h1>
        <p className="mt-1 text-sm opacity-60">{site.organization.name}</p>

        {site.descriptionEditorial ? (
          <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{site.descriptionEditorial}</p>
        ) : null}

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="font-medium">{t("address")}</dt>
            <dd className="opacity-70">
              {addressParts.length > 0 ? addressParts.join(" · ") : t("unknownValue")}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t("phone")}</dt>
            <dd className="opacity-70">{site.phone || t("unknownValue")}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("email")}</dt>
            <dd className="opacity-70">
              {site.email ? (
                <a href={`mailto:${site.email}`} className="underline">
                  {site.email}
                </a>
              ) : (
                t("unknownValue")
              )}
            </dd>
          </div>
          {site.website ? (
            <div>
              <dt className="font-medium">{t("website")}</dt>
              <dd>
                <a href={site.website} className="underline opacity-70" target="_blank" rel="noopener noreferrer">
                  {site.website}
                </a>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium">{t("servicesLabel")}</dt>
            <dd className="opacity-70">
              {services?.value && Array.isArray(services.value) && services.value.length > 0
                ? services.value.join(", ")
                : t("unknownValue")}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t("autonomyLabel")}</dt>
            <dd className="opacity-70">
              {autonomy?.value
                ? Array.isArray(autonomy.value)
                  ? autonomy.value.join(", ")
                  : String(autonomy.value)
                : t("unknownValue")}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t("pricingLabel")}</dt>
            <dd className="opacity-70">
              {isConfirmedPricing(pricing) && pricing?.value?.monthlyFrom != null
                ? `${pricing.value.monthlyFrom}${
                    pricing.value.monthlyTo != null ? `–${pricing.value.monthlyTo}` : ""
                  } ${pricing.value.currency || "$"}/mo`
                : t("unknownValue")}
            </dd>
          </div>
        </dl>

        {photoList.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {photoList.map((photo, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)]">
                <Image
                  src={photo.url}
                  alt={photo.alt || site.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm opacity-50">{t("noPhotos")}</p>
        )}

        <p className="mt-6 text-xs opacity-50">
          {t("updatedAt")}: {site.updatedAt.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA")}
        </p>

        <div className="mt-8">
          <Link
            href={applyHref}
            className="inline-block rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white"
            data-testid="apply-to-site"
          >
            {t("applyToSite")}
          </Link>
          <p className="mt-2 text-xs opacity-60">{t("applyToSiteHelp")}</p>
        </div>
      </div>

      <p className="text-sm">
        <Link href={`/${locale}/residences`} className="underline opacity-70">
          {t("catalog")}
        </Link>
      </p>
    </section>
  );
}
