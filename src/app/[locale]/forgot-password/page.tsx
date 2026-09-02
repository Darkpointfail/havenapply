import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/auth-actions";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";

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

  async function action(formData: FormData) {
    "use server";
    await requestPasswordReset(String(formData.get("email") || ""));
    redirect(`/${locale}/forgot-password?sent=1`);
  }

  return (
    <AuthCard title={t("forgotPassword")}>
      {q.sent ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("checkEmail")}
        </p>
      ) : null}
      <form action={action} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
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
