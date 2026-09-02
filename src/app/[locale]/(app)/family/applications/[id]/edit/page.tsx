import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { getApplicationForUser } from "@/lib/applications";
import { AuthzError } from "@/lib/authz";
import { computeDraftProgress } from "@/lib/application-schema";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import {
  updateDraftContactAction,
  updateDraftResidentAction,
} from "@/app/actions/applications";

export default async function EditApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ step?: string; error?: string }>;
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

  const progress = computeDraftProgress(app);
  const step =
    q.step === "contact" || app.draftStep >= 3
      ? "contact"
      : "resident";
  const csrfToken = await getCsrfToken();

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="ha-card">
        <p className="text-sm opacity-60">
          {app.publicRef} · {app.site.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {step === "contact" ? t("stepContact") : t("stepResident")}
        </h1>
        <p className="mt-2 text-sm opacity-70">
          {t("draftProgress")}: {progress.percent}%
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--fs-subtle,#eef3f0)]">
          <div
            className="h-full rounded-full bg-[var(--brand)]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {q.error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {q.error === "VALIDATION_FAILED" ? t("validationError") : q.error}
          </p>
        ) : null}

        {step === "resident" ? (
          <form
            action={updateDraftResidentAction.bind(null, locale, app.id)}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("residentPreferredName")}</span>
              <input
                name="residentPreferredName"
                required
                maxLength={80}
                defaultValue={app.residentPreferredName || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("residentBirthYear")}</span>
              <input
                name="residentBirthYear"
                type="number"
                required
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={app.residentBirthYear ?? ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("preferredMoveMonth")}</span>
              <input
                name="preferredMoveMonth"
                placeholder="2026-09"
                pattern="\d{4}-(0[1-9]|1[0-2])"
                defaultValue={app.preferredMoveMonth || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("urgencyNote")}</span>
              <textarea
                name="urgencyNote"
                maxLength={500}
                rows={3}
                defaultValue={app.urgencyNote || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("saveContinue")}
            </button>
          </form>
        ) : (
          <form
            action={updateDraftContactAction.bind(null, locale, app.id)}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("contactName")}</span>
              <input
                name="contactName"
                required
                maxLength={80}
                defaultValue={app.contactName || session.user.name || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("contactEmail")}</span>
              <input
                name="contactEmail"
                type="email"
                required
                defaultValue={app.contactEmail || session.user.email || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-70">{t("contactPhone")}</span>
              <input
                name="contactPhone"
                type="tel"
                required
                minLength={7}
                maxLength={32}
                defaultValue={app.contactPhone || ""}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("saveContinue")}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm">
          <Link href={`/${locale}/family/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
          {" · "}
          <span className="opacity-50">{statusLabel(locale, app.status)}</span>
        </p>
      </div>
    </section>
  );
}
