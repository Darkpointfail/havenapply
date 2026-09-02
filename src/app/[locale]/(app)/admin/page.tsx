import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";

export default async function AdminHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("ADMIN", locale);
  const t = createT(locale);

  return (
    <section className="space-y-6">
      <div className="ha-card">
        <h1 className="ha-title">{t("adminConsole")}</h1>
        <p className="ha-subtitle">
          {t("welcome")}, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${locale}/admin/organizations`}
          className="rounded-xl border border-[var(--line)] bg-white p-6 transition hover:border-[var(--brand)]"
        >
          <h2 className="text-lg font-semibold">{t("adminOrgs")}</h2>
          <p className="ha-subtitle">{t("createOrg")}</p>
        </Link>
        <Link
          href={`/${locale}/admin/sites`}
          className="rounded-xl border border-[var(--line)] bg-white p-6 transition hover:border-[var(--brand)]"
        >
          <h2 className="text-lg font-semibold">{t("adminSites")}</h2>
          <p className="ha-subtitle">{t("createSite")}</p>
        </Link>
      </div>
    </section>
  );
}
