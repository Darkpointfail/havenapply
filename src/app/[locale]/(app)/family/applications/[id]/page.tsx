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
import { FamilyDocumentsResponseForm } from "@/components/FamilyDocumentsResponseForm";
import { uploadDocumentAction } from "@/app/actions/documents";
import { familyDocumentsProvidedAction } from "@/app/actions/applications";
import { isTerminalStatus } from "@/lib/application-status";

function displayOrUnknown(value: string | number | null | undefined, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default async function ApplicationStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; uploaded?: string; ok?: string }>;
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
  const unknown = t("notProvided");
  const canUpload = !isTerminalStatus(app.status);

  const latestNeedsDocs = [...app.statusHistory]
    .reverse()
    .find((h) => h.toStatus === "NEEDS_DOCUMENTS");
  const requestedDocs = Array.isArray(latestNeedsDocs?.requestedDocuments)
    ? (latestNeedsDocs!.requestedDocuments as string[])
    : [];

  const errorKey = q.error
    ? (`error${q.error}` as Parameters<typeof t>[0])
    : null;
  const errorMessage = errorKey
    ? t(errorKey) !== errorKey
      ? t(errorKey)
      : t("errorGENERIC")
    : null;

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="ha-card">
        <p className="text-sm opacity-60">{t("referenceNumber")}</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{app.publicRef}</h1>
        <p className="mt-3 text-sm">
          {app.site.name}
          {app.site.city ? ` · ${app.site.city}` : ""}
        </p>
        <p
          className="mt-4 inline-flex rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium"
          data-testid="family-app-status"
        >
          {statusLabel(locale, app.status)}
        </p>

        {q.ok ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("transitionOk")}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            data-testid="family-transition-error"
          >
            {errorMessage}
          </p>
        ) : null}

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("residentPreferredName")}</dt>
            <dd>{displayOrUnknown(app.residentPreferredName, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("contactEmail")}</dt>
            <dd>{displayOrUnknown(app.contactEmail, unknown)}</dd>
          </div>
        </dl>

        {app.status === "NEEDS_DOCUMENTS" && requestedDocs.length > 0 ? (
          <div className="mt-6" data-testid="family-requested-docs">
            <h2 className="text-sm font-semibold">{t("documentsRequestedTitle")}</h2>
            {latestNeedsDocs?.familyMessage ? (
              <p className="mt-2 text-sm opacity-80">{latestNeedsDocs.familyMessage}</p>
            ) : null}
            <ul className="mt-2 list-inside list-disc text-sm">
              {requestedDocs.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="mt-8 text-sm font-semibold">{t("documents")}</h2>
        {q.uploaded ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("uploadSuccess")}: {q.uploaded}
          </p>
        ) : null}
        {canUpload ? (
          <div className="mt-4">
            <DocumentUploadForm
              applicationId={app.id}
              csrfToken={csrfToken}
              action={uploadDocumentAction.bind(null, locale, app.id)}
              labels={{
                upload: t("uploadDocument"),
                uploading: t("uploadingDocument"),
                error: q.error && !errorMessage ? q.error : null,
                allowedTypes: t("allowedTypes"),
              }}
            />
          </div>
        ) : null}
        <DocumentList
          documents={documents}
          canDownload
          canDelete={canUpload}
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

        {app.status === "NEEDS_DOCUMENTS" ? (
          <div className="mt-6">
            <FamilyDocumentsResponseForm
              expectedVersion={app.version}
              csrfToken={csrfToken}
              action={familyDocumentsProvidedAction.bind(null, locale, app.id)}
              labels={{
                title: t("documentsRespondTitle"),
                help: t("documentsRespondHelp"),
                message: t("documentsRespondMessage"),
                submit: t("documentsRespondSubmit"),
                submitting: t("documentsRespondSubmitting"),
              }}
            />
          </div>
        ) : null}

        <h2 className="mt-8 text-sm font-semibold">{t("timeline")}</h2>
        <ol className="mt-3 space-y-3 text-sm" data-testid="family-timeline">
          {app.statusHistory.map((entry) => {
            const docs = Array.isArray(entry.requestedDocuments)
              ? (entry.requestedDocuments as string[])
              : [];
            return (
              <li
                key={entry.id}
                className="border-b border-[var(--line)] py-2"
                data-testid={`family-timeline-${entry.toStatus}`}
              >
                <div className="flex justify-between gap-3">
                  <span>
                    {entry.fromStatus
                      ? `${statusLabel(locale, entry.fromStatus)} → ${statusLabel(locale, entry.toStatus)}`
                      : statusLabel(locale, entry.toStatus)}
                  </span>
                  <time className="opacity-50" dateTime={entry.createdAt.toISOString()}>
                    {entry.createdAt.toLocaleDateString(locale)}
                  </time>
                </div>
                {/* Never expose internalNote to family */}
                {entry.familyMessage ? (
                  <p className="mt-1 text-xs opacity-80">{entry.familyMessage}</p>
                ) : null}
                {entry.nextSteps ? (
                  <p className="mt-1 text-xs opacity-80">
                    {t("nextSteps")}: {entry.nextSteps}
                  </p>
                ) : null}
                {entry.waitlistPosition != null ? (
                  <p className="mt-1 text-xs opacity-80">
                    {t("waitlistPosition")}: {entry.waitlistPosition}
                  </p>
                ) : null}
                {docs.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs opacity-70">
                    {docs.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
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
