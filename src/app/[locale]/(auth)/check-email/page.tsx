import Link from "next/link";
import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";

export default async function CheckEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const q = await searchParams;

  return (
    <AuthCard title={t("checkEmailTitle")} locale={locale}>
      <p className="text-sm leading-relaxed opacity-80">{t("checkEmailBody")}</p>
      {q.email ? <p className="mt-3 text-sm font-medium">{q.email}</p> : null}
      <p className="mt-6 text-sm opacity-70">
        <Link href={`/${locale}/sign-in`} className="underline">
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
