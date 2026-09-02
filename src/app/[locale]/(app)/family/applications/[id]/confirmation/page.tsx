import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { getApplicationForUser } from "@/lib/applications";
import { AuthzError } from "@/lib/authz";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("FAMILY", locale);
  const t = createT(locale);

  let app;
  try {
    app = await getApplicationForUser(session.user.id, session.user.role, id, {
      auditView: true,
    });
  } catch (error) {
    if (error instanceof AuthzError) redirect(`/${locale}/family/dashboard`);
    throw error;
  }

  if (app.status === "DRAFT") {
    redirect(`/${locale}/family/applications/${app.id}/edit`);
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="ha-title">{t("submissionConfirmed")}</h1>
        <p className="mt-3 text-sm opacity-70">{t("submissionConfirmedBody")}</p>
        <p className="mt-6 text-xs uppercase tracking-wide opacity-50">{t("referenceNumber")}</p>
        <p className="mt-1 font-mono text-xl font-semibold">{app.publicRef}</p>
        <p className="mt-2 text-sm opacity-60">
          {app.site.name} · {statusLabel(locale, app.status)}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}/family/applications/${app.id}`}
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            {t("openStatus")}
          </Link>
          <Link
            href={`/${locale}/family/dashboard`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            {t("backToList")}
          </Link>
        </div>
      </div>
    </section>
  );
}
