import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffOrgRole } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, statusLabel, type Locale } from "@/lib/i18n";
import { getApplicationForUser } from "@/lib/applications";
import { listApplicationDocuments } from "@/lib/documents";
import { AuthzError, getStaffMembershipForSite } from "@/lib/authz";
import { getCsrfToken } from "@/lib/csrf";
import { DocumentList } from "@/components/DocumentList";
import { StaffStatusTransitionForm } from "@/components/StaffStatusTransitionForm";
import { staffTransitionApplicationAction } from "@/app/actions/applications";
import { allowedStaffTargets } from "@/lib/application-status";

function displayOrUnknown(value: string | number | null | undefined, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default async function StaffApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole(["STAFF", "ADMIN"], locale);
  const t = createT(locale);
  const q = await searchParams;

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
  const csrfToken = await getCsrfToken();

  let canMutate = session.user.role === "ADMIN";
  let canReopen = session.user.role === "ADMIN";
  if (session.user.role === "STAFF") {
    const membership = await getStaffMembershipForSite(session.user.id, app.siteId);
    canMutate =
      membership?.orgRole === StaffOrgRole.OWNER ||
      membership?.orgRole === StaffOrgRole.EDITOR;
    canReopen = membership?.orgRole === StaffOrgRole.OWNER;
  }

  const unknown = t("notProvided");
  const errorKey = q.error
    ? (`error${q.error}` as Parameters<typeof t>[0])
    : null;
  const errorMessage = errorKey
    ? t(errorKey) !== errorKey
      ? t(errorKey)
      : t("errorGENERIC")
    : null;

  const statusLabels = Object.fromEntries(
    [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "NEEDS_DOCUMENTS",
      "WAITLISTED",
      "ACCEPTED",
      "REJECTED",
      "WITHDRAWN",
    ].map((s) => [s, statusLabel(locale, s)]),
  );

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
        <p className="text-sm opacity-60">{t("referenceNumber")}</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{app.publicRef}</h1>
        <p className="mt-3 text-sm">
          {app.family.displayName} → {app.site.name}
        </p>
        <p
          className="mt-4 inline-flex rounded-full bg-[var(--fs-subtle,#eef3f0)] px-3 py-1 text-xs font-medium"
          data-testid="staff-app-status"
        >
          {statusLabel(locale, app.status)}
        </p>

        {q.ok ? (
          <p
            className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            data-testid="staff-transition-ok"
          >
            {t("transitionOk")}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            data-testid="staff-transition-error"
          >
            {errorMessage}
          </p>
        ) : null}

        <h2 className="mt-8 text-sm font-semibold">{t("candidateSummary")}</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("residentPreferredName")}</dt>
            <dd data-testid="staff-resident-name">
              {displayOrUnknown(app.residentPreferredName, unknown)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("residentBirthYear")}</dt>
            <dd>{displayOrUnknown(app.residentBirthYear, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("family")}</dt>
            <dd>{app.family.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("site")}</dt>
            <dd>
              {app.site.name}
              {app.site.city ? ` · ${app.site.city}` : ""}
            </dd>
          </div>
        </dl>

        <h2 className="mt-8 text-sm font-semibold">{t("transmittedData")}</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("contactName")}</dt>
            <dd>{displayOrUnknown(app.contactName, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("contactEmail")}</dt>
            <dd>{displayOrUnknown(app.contactEmail, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("contactPhone")}</dt>
            <dd>{displayOrUnknown(app.contactPhone, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("preferredMoveMonth")}</dt>
            <dd>{displayOrUnknown(app.preferredMoveMonth, unknown)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t("urgencyNote")}</dt>
            <dd className="text-right">{displayOrUnknown(app.urgencyNote, unknown)}</dd>
          </div>
        </dl>

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

        <h2 className="mt-8 text-sm font-semibold">{t("history")}</h2>
        <ol className="mt-3 space-y-3 text-sm" data-testid="staff-history">
          {app.statusHistory.map((entry) => {
            const docs = Array.isArray(entry.requestedDocuments)
              ? (entry.requestedDocuments as string[])
              : [];
            return (
              <li
                key={entry.id}
                className="border-b border-[var(--line)] py-2"
                data-testid={`staff-history-${entry.toStatus}`}
              >
                <div className="flex justify-between gap-3">
                  <span>
                    {entry.fromStatus
                      ? `${statusLabel(locale, entry.fromStatus)} → ${statusLabel(locale, entry.toStatus)}`
                      : statusLabel(locale, entry.toStatus)}
                    {entry.isReopen ? " · réouverture" : ""}
                  </span>
                  <time className="opacity-50" dateTime={entry.createdAt.toISOString()}>
                    {entry.createdAt.toLocaleDateString(locale)}
                  </time>
                </div>
                {entry.internalNote ? (
                  <p className="mt-1 text-xs opacity-70" data-testid="staff-internal-note-history">
                    {t("internalNote")}: {entry.internalNote}
                  </p>
                ) : null}
                {entry.familyMessage ? (
                  <p className="mt-1 text-xs opacity-70">
                    {t("familyMessage")}: {entry.familyMessage}
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

        <h2 className="mt-8 text-sm font-semibold">{t("staffActions")}</h2>
        <div className="mt-3">
          <StaffStatusTransitionForm
            applicationId={app.id}
            currentStatus={app.status}
            version={app.version}
            csrfToken={csrfToken}
            allowedTargets={allowedStaffTargets(app.status)}
            canMutate={canMutate}
            canReopen={canReopen}
            action={staffTransitionApplicationAction.bind(null, locale, app.id)}
            labels={{
              chooseAction: t("chooseTransition"),
              confirm: t("confirmTransition"),
              cancel: t("clearFilters"),
              submit: t("transitionSubmit"),
              submitting: t("transitionSubmitting"),
              internalNote: t("internalNote"),
              familyMessage: t("familyMessage"),
              requestedDocuments: t("requestedDocuments"),
              requestedDocumentsHelp: t("requestedDocumentsHelp"),
              waitlistPosition: t("waitlistPosition"),
              waitlistPositionHelp: t("waitlistPositionHelp"),
              nextSteps: t("nextSteps"),
              reopenReason: t("reopenReason"),
              confirmPrompt: t("confirmTransitionPrompt"),
              readOnly: t("staffReadOnly"),
              statusLabels,
            }}
          />
        </div>

        <p className="mt-6 text-sm">
          <Link href={`/${locale}/staff/dashboard`} className="underline opacity-70">
            {t("backToList")}
          </Link>
        </p>
      </div>
    </section>
  );
}
