import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const session = await auth();

  if (session?.user) {
    redirect(dashboardPathForRole(session.user.role, locale));
  }

  return (
    <section className="mx-auto max-w-2xl pt-8">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--brand)]">
        {t("appName")}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t("tagline")}</h1>
      <p className="mt-4 text-base leading-relaxed text-black/70">
        {locale === "fr"
          ? "Fondation exécutable : authentification, rôles, stockage privé et courriel locaux."
          : "Executable foundation: authentication, roles, private storage, and local email."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/${locale}/residences`}
          className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium"
        >
          {t("catalog")}
        </Link>
        <Link
          href={`/${locale}/sign-up`}
          className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white"
        >
          {t("signUp")}
        </Link>
        <Link
          href={`/${locale}/sign-in`}
          className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium"
        >
          {t("signIn")}
        </Link>
      </div>
    </section>
  );
}
