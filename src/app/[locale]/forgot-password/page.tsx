import Link from "next/link";
import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { forgotAction } from "@/app/actions/auth";

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const q = await searchParams;
  const csrfToken = await getCsrfToken();

  return (
    <AuthCard title={t("forgotPassword")}>
      {q.sent ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("checkEmail")}</p>
      ) : null}
      <form action={forgotAction.bind(null, locale)} className="space-y-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("email")}</span>
          <input name="email" type="email" required className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
        >
          {t("sendReset")}
        </button>
      </form>
      <p className="mt-4 text-sm opacity-70">
        <Link href={`/${locale}/sign-in`} className="underline">
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
