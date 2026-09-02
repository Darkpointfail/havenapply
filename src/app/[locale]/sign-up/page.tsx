import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/AuthCard";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { registerAction } from "@/app/actions/auth";
import { dashboardPathForRole } from "@/lib/paths";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    inviteKind?: string;
    inviteToken?: string;
    next?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);
  const session = await auth();
  const q = await searchParams;
  if (session?.user?.emailVerified) {
    redirect(dashboardPathForRole(session.user.role, locale));
  }
  const csrfToken = await getCsrfToken();
  const inviteKind =
    q.inviteKind === "caregiver" || q.inviteKind === "staff" ? q.inviteKind : "";
  const inviteToken = q.inviteToken || "";
  const viaInvite = Boolean(inviteKind && inviteToken);

  return (
    <AuthCard title={t("signUp")}>
      {q.error === "email_taken" ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("emailTaken")}</p>
      ) : null}
      {q.error === "rate_limited" ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("rateLimited")}</p>
      ) : null}
      {q.error === "invite_invalid" ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("inviteNotFound")}
        </p>
      ) : null}
      {viaInvite ? (
        <p className="mb-4 rounded-lg bg-[var(--fs-subtle,#eef3f0)] px-3 py-2 text-sm">
          {t("inviteValid")}
        </p>
      ) : null}
      <form action={registerAction.bind(null, locale)} className="space-y-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        {q.next ? <input type="hidden" name="next" value={q.next} /> : null}
        {viaInvite ? (
          <>
            <input type="hidden" name="inviteKind" value={inviteKind} />
            <input type="hidden" name="inviteToken" value={inviteToken} />
          </>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("name")}</span>
          <input name="name" required className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block opacity-70">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            data-testid="sign-up-email"
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
            data-testid="sign-up-password"
          />
        </label>
        {!viaInvite ? (
          <label className="block text-sm">
            <span className="mb-1 block opacity-70">{t("role")}</span>
            <select name="role" className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" defaultValue="FAMILY">
              <option value="FAMILY">{t("roleFamily")}</option>
              <option value="STAFF">{t("roleStaff")}</option>
            </select>
          </label>
        ) : (
          <input
            type="hidden"
            name="role"
            value={inviteKind === "staff" ? "STAFF" : "FAMILY"}
          />
        )}
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
          data-testid="sign-up-submit"
        >
          {t("submit")}
        </button>
      </form>
      <p className="mt-4 text-sm opacity-70">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={
            viaInvite
              ? `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/invite/${inviteKind}?t=${inviteToken}`)}`
              : `/${locale}/sign-in`
          }
          className="underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
