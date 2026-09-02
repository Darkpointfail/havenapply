import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { listStaffApplications } from "@/lib/applications";

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole(["STAFF", "ADMIN"], locale);
  const t = createT(locale);
  const applications = await listStaffApplications(session.user.id, session.user.role);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("staffDashboard")}</h1>
        <p className="mt-2 text-sm opacity-70">
          {t("welcome")}, {session.user.name || session.user.email}
          {session.user.isDevAccount ? " · DEV" : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <h2 className="text-lg font-semibold">{t("applications")}</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">{t("emptyStaff")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {applications.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {app.family.displayName} → {app.site.name}
                  </p>
                  <p className="opacity-60">{app.publicRef || app.id}</p>
                </div>
                <span className="rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium">
                  {app.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
