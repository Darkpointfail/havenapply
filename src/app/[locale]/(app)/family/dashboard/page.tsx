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
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("familyDashboard")}</h1>
            <p className="mt-2 text-sm opacity-70">
              {t("welcome")}, {session.user.name || session.user.email}
              {session.user.isDevAccount ? " · DEV" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/family/members`}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              {t("manageMembers")}
            </Link>
            <Link
              href={`/${locale}/family/applications/new`}
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
            >
              {t("newApplication")}
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h2 className="text-lg font-semibold">{t("applications")}</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">{t("emptyFamily")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {applications.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{app.site.name}</p>
                  <p className="opacity-60">{app.publicRef}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium">
                    {statusLabel(locale, app.status)}
                  </span>
                  <Link
                    href={
                      app.status === "DRAFT"
                        ? `/${locale}/family/applications/${app.id}/edit`
                        : `/${locale}/family/applications/${app.id}`
                    }
                    className="underline opacity-80 hover:opacity-100"
                  >
                    {app.status === "DRAFT" ? t("continueDraft") : t("viewApplication")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
