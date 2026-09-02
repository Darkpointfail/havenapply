import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { resetAction } from "@/app/actions/auth";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const q = await searchParams;
  const csrfToken = await getCsrfToken();

  return (
    <AuthCard title={t("resetPassword")}>
      {q.error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Token invalid or expired.</p>
      ) : null}
      <form action={resetAction.bind(null, locale)} className="space-y-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <input type="hidden" name="token" value={q.token || ""} />
        <input type="hidden" name="email" value={q.email || ""} />
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("newPassword")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
        >
          {t("submit")}
        </button>
      </form>
    </AuthCard>
  );
}
