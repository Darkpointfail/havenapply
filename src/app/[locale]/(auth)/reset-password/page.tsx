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
    <AuthCard title={t("resetPassword")} locale={locale}>
      {q.error ? (
        <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">Token invalid or expired.</p>
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
            className="ha-input"
          />
        </label>
        <button
          type="submit"
          className="ha-btn ha-btn-primary w-full"
        >
          {t("submit")}
        </button>
      </form>
    </AuthCard>
  );
}
