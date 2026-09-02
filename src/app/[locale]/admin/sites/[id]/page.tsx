import Link from "next/link";
import { redirect } from "next/navigation";
import type { SiteStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, siteStatusLabel, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { parseProvenanced, type ProvenancedValue } from "@/lib/provenance";
import { canTransitionSiteStatus } from "@/lib/site-status";
import {
  findDuplicateCandidates,
  getAdminSite,
  listAdminOrganizations,
} from "@/lib/residences";
import {
  markDuplicateAction,
  transitionSiteAction,
  updateSiteAction,
} from "@/app/actions/admin-catalog";

const ALL_STATUSES: SiteStatus[] = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
];

function factProvenance(fact: ProvenancedValue | null, t: ReturnType<typeof createT>) {
  if (!fact) return null;
  return `${t("sourceLabel")}: ${fact.source} · ${fact.confidence}`;
}

function formatFactValue(
  fact: ProvenancedValue | null,
  t: ReturnType<typeof createT>,
  formatter?: (value: unknown) => string,
): string {
  if (!fact || fact.value == null) return t("unknownValue");
  if (formatter) return formatter(fact.value);
  if (Array.isArray(fact.value)) return fact.value.join(", ");
  return String(fact.value);
}

export default async function EditSitePage({
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

  const [site, orgs, duplicates] = await Promise.all([
    getAdminSite(session.user.role, id),
    listAdminOrganizations({ role: session.user.role, pageSize: 100 }),
    findDuplicateCandidates(session.user.role, id),
  ]);

  const servicesFact = parseProvenanced<string[]>(site.servicesFact);
  const pricingFact = parseProvenanced<{
    monthlyFrom?: number;
    monthlyTo?: number;
    currency?: string;
  }>(site.pricingFact);
  const autonomyFact = parseProvenanced<string | string[]>(site.autonomyFact);
  const availabilityFact = parseProvenanced<unknown>(site.availabilityFact);

  const nextStatuses = ALL_STATUSES.filter((s) => canTransitionSiteStatus(site.status, s));

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("editSite")}</h1>
            <p className="mt-2 text-sm opacity-70">
              <Link href={`/${locale}/admin/sites`} className="underline">
                {t("adminSites")}
              </Link>
            </p>
            <p className="mt-1 text-sm">
              {t("siteStatus")}:{" "}
              <span className="font-medium">{siteStatusLabel(locale, site.status)}</span>
            </p>
          </div>
          {site.status === "ACTIVE" ? (
            <Link
              href={`/${locale}/residences/${site.slug}`}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
              target="_blank"
            >
              {t("previewPublic")}
            </Link>
          ) : null}
        </div>

        {q.ok ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">OK</p>
        ) : null}
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        {nextStatuses.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {nextStatuses.map((toStatus) => (
              <form key={toStatus} action={transitionSiteAction.bind(null, locale, id)}>
                <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                <input type="hidden" name="toStatus" value={toStatus} />
                <button
                  type="submit"
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm hover:border-[var(--brand)]"
                >
                  → {siteStatusLabel(locale, toStatus)}
                </button>
              </form>
            ))}
          </div>
        ) : null}

        <form action={updateSiteAction.bind(null, locale, id)} className="mt-6 space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <label className="block text-sm">
            <span className="opacity-70">{t("adminOrgs")}</span>
            <select
              name="organizationId"
              defaultValue={site.organizationId}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            >
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
              defaultValue={site.name}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">Slug</span>
            <input
              name="slug"
              defaultValue={site.slug}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("address")}</span>
            <input
              name="addressLine1"
              defaultValue={site.addressLine1 || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("filterCity")}</span>
            <input
              name="city"
              defaultValue={site.city || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("region")}</span>
            <input
              name="region"
              defaultValue={site.region || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("postalCode")}</span>
            <input
              name="postalCode"
              defaultValue={site.postalCode || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("phone")}</span>
            <input
              name="phone"
              type="tel"
              defaultValue={site.phone || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("email")}</span>
            <input
              name="email"
              type="email"
              defaultValue={site.email || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("website")}</span>
            <input
              name="website"
              type="url"
              defaultValue={site.website || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("rlsNumber")}</span>
            <input
              name="rlsNumber"
              defaultValue={site.rlsNumber || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("descriptionEditorial")}</span>
            <textarea
              name="descriptionEditorial"
              rows={4}
              defaultValue={site.descriptionEditorial || ""}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("servicesHint")}</span>
            <textarea
              name="services"
              rows={3}
              defaultValue={
                servicesFact?.value && Array.isArray(servicesFact.value)
                  ? servicesFact.value.join("\n")
                  : ""
              }
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
            {factProvenance(servicesFact, t) ? (
              <span className="mt-1 block text-xs opacity-50">{factProvenance(servicesFact, t)}</span>
            ) : null}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="opacity-70">{t("pricingFrom")}</span>
              <input
                name="pricingFrom"
                type="number"
                min="0"
                step="1"
                defaultValue={pricingFact?.value?.monthlyFrom ?? ""}
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
                defaultValue={pricingFact?.value?.monthlyTo ?? ""}
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              />
            </label>
          </div>
          {factProvenance(pricingFact, t) ? (
            <p className="text-xs opacity-50">{factProvenance(pricingFact, t)}</p>
          ) : null}
          <label className="block text-sm">
            <span className="opacity-70">{t("autonomy")}</span>
            <input
              name="autonomy"
              defaultValue={
                autonomyFact?.value
                  ? Array.isArray(autonomyFact.value)
                    ? autonomyFact.value.join(", ")
                    : String(autonomyFact.value)
                  : ""
              }
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
            {factProvenance(autonomyFact, t) ? (
              <span className="mt-1 block text-xs opacity-50">{factProvenance(autonomyFact, t)}</span>
            ) : null}
          </label>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--fs-subtle,#f8faf9)] p-4 text-sm">
            <p className="mt-2">
              {t("servicesLabel")}: {formatFactValue(servicesFact, t)}
            </p>
            <p className="mt-1">
              {t("pricingLabel")}: {formatFactValue(pricingFact, t, (v) => {
                const p = v as { monthlyFrom?: number; monthlyTo?: number };
                if (p.monthlyFrom == null) return t("unknownValue");
                return p.monthlyTo != null
                  ? `${p.monthlyFrom}–${p.monthlyTo} $`
                  : `${p.monthlyFrom} $`;
              })}
            </p>
            <p className="mt-1">
              {t("autonomyLabel")}: {formatFactValue(autonomyFact, t)}
            </p>
            <p className="mt-1 opacity-70">
              {t("unknownAvailability")}: {formatFactValue(availabilityFact, t)}
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
          >
            {t("save")}
          </button>
        </form>
      </div>

      {duplicates.length > 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <h2 className="text-lg font-semibold">{t("duplicatesFound")}</h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {duplicates.map((dup) => (
              <li key={dup.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{dup.name}</p>
                  <p className="opacity-60">
                    {dup.city || t("unknownValue")} · {siteStatusLabel(locale, dup.status)}
                  </p>
                </div>
                <form action={markDuplicateAction.bind(null, locale, id)}>
                  <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                  <input type="hidden" name="canonicalSiteId" value={dup.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700"
                  >
                    {t("markDuplicate")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h2 className="text-lg font-semibold">{t("changeHistory")}</h2>
        {site.changeHistory.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">—</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {site.changeHistory.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-[var(--line)] px-3 py-2">
                <p className="font-medium">{entry.action}</p>
                <p className="text-xs opacity-60">
                  {entry.createdAt.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA")}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
