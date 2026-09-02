import Link from "next/link";
import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";

export default async function AccessDeniedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
      <h1 className="text-2xl font-semibold">{t("accessDenied")}</h1>
      <p className="mt-3 text-sm opacity-70">{t("accessDeniedBody")}</p>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-block rounded-full bg-[var(--brand)] px-4 py-2 text-sm text-white"
      >
        {t("backHome")}
      </Link>
    </section>
  );
}
