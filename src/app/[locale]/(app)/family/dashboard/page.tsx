import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { listFamilyApplications } from "@/lib/applications";

export default async function FamilyDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("FAMILY", locale);
  const t = createT(locale);
  const applications = await listFamilyApplications(session.user.id, session.user.role);

  return (
    <section className="space-y-6">
      <div className="ha-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ha-pill">{t("appName")}</p>
            <h1 className="ha-title mt-3">{t("familyDashboard")}</h1>
            <p className="ha-subtitle">
              {t("welcome")}, {session.user.name || session.user.email}
              {session.user.isDevAccount ? " · DEV" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/family/members`} className="ha-btn ha-btn-secondary">
              {t("manageMembers")}
            </Link>
            <Link href={`/${locale}/family/applications/new`} className="ha-btn ha-btn-primary">
              {t("newApplication")}
            </Link>
          </div>
        </div>
      </div>

      <div className="ha-card">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--ink)]">{t("applications")}</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("emptyFamily")}</p>
        ) : (
          <ul className="mt-2">
            {applications.map((app) => (
              <li key={app.id} className="ha-list-row text-sm">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{app.site.name}</p>
                  <p className="text-[var(--ink-muted)]">{app.publicRef}</p>
                  <p className="mt-1">
                    <span className="ha-pill">{statusLabel(locale, app.status)}</span>
                  </p>
                </div>
                <Link
                  href={
                    app.status === "DRAFT"
                      ? `/${locale}/family/applications/${app.id}/edit`
                      : `/${locale}/family/applications/${app.id}`
                  }
                  className="ha-btn ha-btn-secondary"
                >
                  {app.status === "DRAFT" ? t("continueDraft") : t("viewApplication")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
