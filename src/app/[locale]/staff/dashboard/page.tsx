import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("STAFF", locale);
  const t = createT(locale);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("staffDashboard")}</h1>
      <p className="mt-2 text-sm opacity-70">
        {t("welcome")}, {session.user.name || session.user.email}
        {session.user.isDevAccount ? " · DEV" : ""}
      </p>
      <p className="mt-6 text-base leading-relaxed opacity-80">{t("emptyStaff")}</p>
    </section>
  );
}
