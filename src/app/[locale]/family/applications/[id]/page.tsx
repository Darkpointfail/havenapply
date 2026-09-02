import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { getApplicationForUser } from "@/lib/applications";
import { listApplicationDocuments } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";
import { getCsrfToken } from "@/lib/csrf";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { DocumentList } from "@/components/DocumentList";
import { uploadDocumentAction } from "@/app/actions/documents";

export default async function ApplicationStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; uploaded?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole("FAMILY", locale);
  const t = createT(locale);
  const q = await searchParams;

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

  const documents = await listApplicationDocuments({
    userId: session.user.id,
    role: session.user.role,
    applicationId: app.id,
  });
  const csrfToken = await getCsrfToken();

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <p className="text-sm opacity-60">{t("referenceNumber")}</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{app.publicRef}</h1>
        <p className="mt-3 text-sm">
          {app.site.name}
          {app.site.city ? ` · ${app.site.city}` : ""}
        </p>
        <p className="mt-4 inline-flex rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium">
          {statusLabel(locale, app.status)}
        </p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("residentPreferredName")}</dt>
            <dd>{app.residentPreferredName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("contactEmail")}</dt>
            <dd>{app.contactEmail}</dd>
          </div>
        </dl>

        <h2 className="mt-8 text-sm font-semibold">{t("documents")}</h2>
        {q.uploaded ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("uploadSuccess")}: {q.uploaded}
          </p>
        ) : null}
        <div className="mt-4">
          <DocumentUploadForm
            applicationId={app.id}
            csrfToken={csrfToken}
            action={uploadDocumentAction.bind(null, locale, app.id)}
            labels={{
              upload: t("uploadDocument"),
              uploading: t("uploadingDocument"),
              error: q.error || null,
              allowedTypes: t("allowedTypes"),
            }}
          />
        </div>
        <DocumentList
          documents={documents}
          canDownload
          canDelete
          csrfToken={csrfToken}
          locale={locale}
          applicationId={app.id}
          labels={{
            empty: t("emptyDocuments"),
            preview: t("previewDocument"),
            download: t("downloadDocument"),
            delete: t("deleteDocument"),
            notRealScan: t("notRealScan"),
          }}
        />

        <h2 className="mt-8 text-sm font-semibold">{t("history")}</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {app.statusHistory.map((entry) => (
            <li
              key={entry.id}
              className="flex justify-between gap-3 border-b border-[var(--line)] py-2"
            >
              <span>
                {entry.fromStatus
                  ? `${statusLabel(locale, entry.fromStatus)} → ${statusLabel(locale, entry.toStatus)}`
                  : statusLabel(locale, entry.toStatus)}
              </span>
              <time className="opacity-50" dateTime={entry.createdAt.toISOString()}>
                {entry.createdAt.toLocaleDateString(locale)}
              </time>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm">
          <Link href={`/${locale}/family/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
        </p>
      </div>
    </section>
  );
}
