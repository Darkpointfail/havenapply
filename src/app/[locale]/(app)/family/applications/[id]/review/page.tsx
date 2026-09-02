import Link from "next/link";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { getApplicationForUser, validateApplicationForSubmit } from "@/lib/applications";
import { AuthzError } from "@/lib/authz";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import { submitApplicationAction } from "@/app/actions/applications";

export default async function ReviewApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("FAMILY", locale);
  const t = createT(locale);
  const q = await searchParams;

  let app;
  try {
    app = await getApplicationForUser(session.user.id, session.user.role, id);
  } catch (error) {
    if (error instanceof AuthzError) redirect(`/${locale}/family/dashboard`);
    throw error;
  }

  if (app.status !== "DRAFT") {
    redirect(`/${locale}/family/applications/${app.id}`);
  }

  const validation = await validateApplicationForSubmit(app.id);
  const csrfToken = await getCsrfToken();
  const idempotencyKey = randomBytes(16).toString("hex");

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="ha-card">
        <h1 className="ha-title">{t("reviewTitle")}</h1>
        <p className="mt-2 text-sm opacity-70">{t("reviewHelp")}</p>
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {q.error === "VALIDATION_FAILED" ? t("validationError") : q.error}
          </p>
        ) : null}

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("site")}</dt>
            <dd className="font-medium text-right">
              {app.site.name}
              {app.site.city ? ` · ${app.site.city}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("residentPreferredName")}</dt>
            <dd className="font-medium text-right">{app.residentPreferredName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("residentBirthYear")}</dt>
            <dd className="font-medium text-right">{app.residentBirthYear ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("contactName")}</dt>
            <dd className="font-medium text-right">{app.contactName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("contactEmail")}</dt>
            <dd className="font-medium text-right">{app.contactEmail || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
            <dt className="opacity-60">{t("contactPhone")}</dt>
            <dd className="font-medium text-right">{app.contactPhone || "—"}</dd>
          </div>
          {app.preferredMoveMonth ? (
            <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
              <dt className="opacity-60">{t("preferredMoveMonth")}</dt>
              <dd className="font-medium text-right">{app.preferredMoveMonth}</dd>
            </div>
          ) : null}
        </dl>

        {!validation.success ? (
          <p className="mt-4 text-sm text-amber-800">
            {t("validationError")}{" "}
            <Link
              href={`/${locale}/family/applications/${app.id}/edit`}
              className="underline"
            >
              {t("continueDraft")}
            </Link>
          </p>
        ) : (
          <form
            action={submitApplicationAction.bind(null, locale, app.id)}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consentPrivacy" required className="mt-1" />
              <span>{t("consentPrivacy")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consentShareWithSite" required className="mt-1" />
              <span>{t("consentShareWithSite")}</span>
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("submitApplication")}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm">
          <Link
            href={`/${locale}/family/applications/${app.id}/edit?step=contact`}
            className="underline opacity-70"
          >
            {t("stepContact")}
          </Link>
          {" · "}
          <Link href={`/${locale}/family/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
        </p>
      </div>
    </section>
  );
}
