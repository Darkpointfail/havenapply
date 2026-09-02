import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { peekCaregiverInvitation } from "@/lib/caregiver-invitations";
import { peekStaffInvitation } from "@/lib/staff-invitations";
import {
  acceptCaregiverInviteAction,
  acceptStaffInviteAction,
} from "@/app/actions/invitations";

function stateMessage(t: ReturnType<typeof createT>, state: string) {
  switch (state) {
    case "VALID":
      return t("inviteValid");
    case "EXPIRED":
      return t("inviteExpired");
    case "REVOKED":
      return t("inviteRevoked");
    case "USED":
      return t("inviteUsed");
    case "WRONG_ACCOUNT":
      return t("inviteWrongAccount");
    case "RATE_LIMITED":
      return t("rateLimited");
    default:
      return t("inviteNotFound");
  }
}

export default async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; kind: string }>;
  searchParams: Promise<{ t?: string; error?: string }>;
}) {
  const { locale: raw, kind: kindRaw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const kind = kindRaw === "staff" ? "staff" : kindRaw === "caregiver" ? "caregiver" : null;
  if (!kind) redirect(`/${locale}`);

  const t = createT(locale);
  const q = await searchParams;
  const token = q.t || "";
  const session = await auth();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");

  const peek =
    kind === "caregiver"
      ? await peekCaregiverInvitation({
          token,
          ipAddress: ip,
          viewerEmail: session?.user?.email,
        })
      : await peekStaffInvitation({
          token,
          ipAddress: ip,
          viewerEmail: session?.user?.email,
        });

  const csrfToken = await getCsrfToken();
  const nextPath = `/${locale}/invite/${kind}?t=${encodeURIComponent(token)}`;
  const title =
    kind === "caregiver" ? t("inviteCaregiverTitle") : t("inviteStaffTitle");

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8" data-testid="invite-panel">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p
          className="mt-3 text-sm opacity-80"
          data-testid="invite-state"
          data-state={peek.state}
        >
          {stateMessage(t, peek.state)}
        </p>

        {peek.state === "VALID" && "familyDisplayName" in peek && peek.familyDisplayName ? (
          <p className="mt-2 text-sm">
            {t("inviteFamilyLabel")}: <strong>{peek.familyDisplayName}</strong>
            {peek.role ? ` · ${peek.role}` : ""}
          </p>
        ) : null}
        {peek.state === "VALID" && "organizationName" in peek && peek.organizationName ? (
          <p className="mt-2 text-sm">
            {t("inviteOrgLabel")}: <strong>{peek.organizationName}</strong>
            {peek.orgRole ? ` · ${peek.orgRole}` : ""}
          </p>
        ) : null}
        {peek.emailHint ? (
          <p className="mt-2 text-xs opacity-60">
            {t("inviteEmailHint")}: {peek.emailHint}
          </p>
        ) : null}

        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        {peek.state === "VALID" && !session?.user ? (
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/${locale}/sign-in?next=${encodeURIComponent(nextPath)}`}
              className="rounded-full bg-[var(--brand)] px-4 py-2.5 text-center text-sm font-medium text-white"
              data-testid="invite-sign-in"
            >
              {t("signIn")}
            </Link>
            <Link
              href={`/${locale}/sign-up?inviteKind=${kind}&inviteToken=${encodeURIComponent(token)}`}
              className="rounded-full border border-[var(--line)] px-4 py-2.5 text-center text-sm"
              data-testid="invite-sign-up"
            >
              {t("signUp")}
            </Link>
          </div>
        ) : null}

        {peek.state === "VALID" && session?.user ? (
          <form
            className="mt-6"
            action={
              kind === "caregiver"
                ? acceptCaregiverInviteAction.bind(null, locale, token)
                : acceptStaffInviteAction.bind(null, locale, token)
            }
          >
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <button
              type="submit"
              data-testid="invite-accept"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("inviteAccept")}
            </button>
          </form>
        ) : null}

        {peek.state === "WRONG_ACCOUNT" && session?.user ? (
          <div className="mt-6 space-y-3 text-sm">
            <p>{t("inviteWrongAccountHelp")}</p>
            <Link href={`/${locale}/sign-in`} className="underline">
              {t("signIn")}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
