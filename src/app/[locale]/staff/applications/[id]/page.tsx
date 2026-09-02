import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { getApplicationForUser } from "@/lib/applications";
import { listApplicationDocuments } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";
import { DocumentList } from "@/components/DocumentList";

export default async function StaffApplicationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole(["STAFF", "ADMIN"], locale);
  const t = createT(locale);

  let app;
  try {
    app = await getApplicationForUser(session.user.id, session.user.role, id, {
      auditView: true,
    });
  } catch (error) {
    if (error instanceof AuthzError) redirect(`/${locale}/staff/dashboard`);
    throw error;
  }

  const documents = await listApplicationDocuments({
    userId: session.user.id,
    role: session.user.role,
    applicationId: app.id,
  });

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <p className="text-sm opacity-60">{t("referenceNumber")}</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{app.publicRef}</h1>
        <p className="mt-3 text-sm">
          {app.family.displayName} → {app.site.name}
        </p>
        <p className="mt-4 inline-flex rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium">
          {statusLabel(locale, app.status)}
        </p>

        <h2 className="mt-8 text-sm font-semibold">{t("documents")}</h2>
        <p className="mt-1 text-xs opacity-60">{t("notRealScan")}</p>
        <DocumentList
          documents={documents}
          canDownload
          canDelete={false}
          labels={{
            empty: t("emptyDocuments"),
            preview: t("previewDocument"),
            download: t("downloadDocument"),
            delete: t("deleteDocument"),
            notRealScan: t("notRealScan"),
          }}
        />

        <p className="mt-6 text-sm">
          <Link href={`/${locale}/staff/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
        </p>
      </div>
    </section>
  );
}
