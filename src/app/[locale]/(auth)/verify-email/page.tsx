import { redirect } from "next/navigation";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";
import { verifyAction } from "@/app/actions/auth";

export default async function VerifyEmailPage({
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

  // Cookie session must be set in a Server Action — do not call verifyEmail during RSC render.
  return (
    <AuthCard title={t("verifyEmail")} locale={locale}>
      <p className="mb-4 text-sm opacity-70">{t("verifyEmailBody")}</p>
      {q.error ? (
        <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          Token invalid or expired.
        </p>
      ) : null}
      <form action={verifyAction.bind(null, locale)} className="space-y-4">
        <input type="hidden" name="token" value={q.token || ""} />
        <input type="hidden" name="email" value={q.email || ""} />
        <button
          type="submit"
          className="ha-btn ha-btn-primary w-full"
          data-testid="verify-email-submit"
        >
          {t("submit")}
        </button>
      </form>
    </AuthCard>
  );
}
