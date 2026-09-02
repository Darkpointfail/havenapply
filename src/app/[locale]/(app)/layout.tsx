import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

export default async function AppChromeLayout({
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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-soft)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between gap-4 px-4 md:px-6">
          <Logo href={`/${locale}`} size="nav" className="!ml-0 !translate-y-0" />
          <nav className="flex flex-wrap items-center gap-2 text-[14px] font-semibold md:gap-3">
            <Link
              href={`/${locale}/residences`}
              className="rounded-[12px] px-3 py-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
            >
              {t("catalog")}
            </Link>
            <LocaleSwitcher locale={locale} compact />
            {session?.user ? (
              <>
                <Link
                  href={dashboardPathForRole(session.user.role, locale)}
                  className="rounded-[12px] px-3 py-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                >
                  {session.user.role === "ADMIN"
                    ? t("adminConsole")
                    : session.user.role === "FAMILY"
                      ? t("familyDashboard")
                      : t("staffDashboard")}
                </Link>
                <form action={logoutAction.bind(null, locale)}>
                  <button
                    type="submit"
                    className="rounded-[12px] px-3 py-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                  >
                    {t("signOut")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/sign-in`}
                  className="rounded-[12px] px-3 py-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href={`/${locale}/sign-up`}
                  className="inline-flex h-10 items-center rounded-[12px] bg-[var(--brand-strong)] px-4 text-white shadow-[var(--shadow-xs)] transition hover:brightness-95"
                >
                  {t("signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 md:px-6 md:py-10">
        {children}
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--ink-deep)] text-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <Logo href={`/${locale}`} size="nav" light className="!ml-0 !translate-y-0" />
            <p className="mt-3 max-w-md text-sm text-white/70">
              {locale === "fr"
                ? "Demandes d'admission famille ↔ résidence, conçues pour le Québec."
                : "Family ↔ residence admission applications, built for Quebec."}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <Link href={`/${locale}/residences`} className="hover:text-white">
              {t("catalog")}
            </Link>
            <Link href={`/${locale}/sign-in`} className="hover:text-white">
              {t("signIn")}
            </Link>
            <Link href={`/${locale}`} className="hover:text-white">
              {t("home")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
