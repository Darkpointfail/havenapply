import Link from "next/link";
import { redirect } from "next/navigation";
import { registerUser } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";
import { AuthCard } from "@/components/AuthCard";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
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
    const result = await registerUser({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      role: String(formData.get("role") || "FAMILY"),
    });
    if (!result.ok) {
      redirect(`/${locale}/sign-up?error=email`);
    }
    redirect(dashboardPathForRole(result.role, locale));
  }

  return (
    <AuthCard title={t("signUp")}>
      {q.error === "email" ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("emailTaken")}
        </p>
      ) : null}
      <form action={action} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("name")}</span>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
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
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("role")}</span>
          <select
            name="role"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            defaultValue="FAMILY"
          >
            <option value="FAMILY">{t("roleFamily")}</option>
            <option value="STAFF">{t("roleStaff")}</option>
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
        >
          {t("submit")}
        </button>
      </form>
      <p className="mt-4 text-sm opacity-70">
        {t("alreadyHaveAccount")}{" "}
        <Link href={`/${locale}/sign-in`} className="underline">
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
