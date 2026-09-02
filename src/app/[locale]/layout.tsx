import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";
import { logoutAction } from "@/app/actions/auth";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    redirect("/fr");
  }
  const locale = raw as Locale;
  const t = createT(locale);
  const session = await auth();
  const other: Locale = locale === "fr" ? "en" : "fr";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href={`/${locale}`} className="text-lg font-semibold tracking-tight">
            {t("appName")}
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/${other}`} className="opacity-70 hover:opacity-100">
              {other.toUpperCase()}
            </Link>
            {session?.user ? (
              <>
                <Link
                  href={dashboardPathForRole(session.user.role, locale)}
                  className="opacity-80 hover:opacity-100"
                >
                  {session.user.role === "FAMILY" ? t("familyDashboard") : t("staffDashboard")}
                </Link>
                <form action={logoutAction.bind(null, locale)}>
                  <button type="submit" className="opacity-80 hover:opacity-100">
                    {t("signOut")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href={`/${locale}/sign-in`} className="opacity-80 hover:opacity-100">
                  {t("signIn")}
                </Link>
                <Link
                  href={`/${locale}/sign-up`}
                  className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-white"
                >
                  {t("signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
