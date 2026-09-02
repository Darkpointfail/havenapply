import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { loginAction } from "@/app/actions/auth";
import { dashboardPathForRole } from "@/lib/paths";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const q = await searchParams;
  const session = await auth();
  if (session?.user?.emailVerified) {
    if (q.next?.startsWith(`/${locale}/`) || q.next?.startsWith("/fr/") || q.next?.startsWith("/en/")) {
      redirect(q.next);
    }
    redirect(dashboardPathForRole(session.user.role, locale));
  }
  const csrfToken = await getCsrfToken();

  const errorMessage =
    q.error === "email_not_verified"
      ? t("emailNotVerified")
      : q.error === "rate_limited"
        ? t("rateLimited")
        : q.error
          ? t("invalidCredentials")
          : null;

  const signUpHref = q.next
    ? `/${locale}/sign-up?next=${encodeURIComponent(q.next)}`
    : `/${locale}/sign-up`;

  return (
    <AuthCard title={t("signIn")}>
      {errorMessage ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      <form action={loginAction.bind(null, locale)} className="space-y-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        {q.next ? <input type="hidden" name="next" value={q.next} /> : null}
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
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
      <p className="mt-4 text-sm opacity-70">
        <Link href={`/${locale}/forgot-password`} className="underline">
          {t("forgotPassword")}
        </Link>
      </p>
      <p className="mt-2 text-sm opacity-70">
        {t("needAccount")}{" "}
        <Link href={signUpHref} className="underline">
          {t("signUp")}
        </Link>
      </p>
    </AuthCard>
  );
}
