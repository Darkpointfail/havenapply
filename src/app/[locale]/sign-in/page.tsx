import Link from "next/link";
import { redirect } from "next/navigation";
import { loginUser } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";
import { AuthCard } from "@/components/AuthCard";

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
  const session = await auth();
  if (session?.user) redirect(dashboardPathForRole(session.user.role, locale));
  const q = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const result = await loginUser({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });
    if (!result.ok) {
      redirect(`/${locale}/sign-in?error=credentials`);
    }
    redirect(dashboardPathForRole(result.role, locale));
  }

  return (
    <AuthCard title={t("signIn")}>
      {q.error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("invalidCredentials")}
        </p>
      ) : null}
      <form action={action} className="space-y-4">
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
        <Link href={`/${locale}/sign-up`} className="underline">
          {t("signUp")}
        </Link>
      </p>
    </AuthCard>
  );
}
