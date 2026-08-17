"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { useT } from "@/lib/i18n/locale";
import {
  applicationCareType,
  formatPortalDate,
  initialsFromName,
  isTransitionApplication,
  transitionChecklistProgress,
  type CommunityApplication,
} from "@/lib/community-portal";
import {
  transferReasonLabel,
  transferStatusMeta,
  type PatientTransfer,
} from "@/lib/patient-transfer";

function TransitionCard({ app }: { app: CommunityApplication }) {
  const t = useT();
  const progress = transitionChecklistProgress(app);
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line/80 bg-surface p-5 shadow-xs transition hover:border-line-strong hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
          {initialsFromName(app.seniorName)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              {app.seniorName}
            </h3>
            <Badge tone="success">{t("Accepted")}</Badge>
            {app.status === "move_in_scheduled" ? (
              <Badge tone="brand">{t("Move-in scheduled")}</Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {applicationCareType(app)} · {app.family.name}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {t("Preferred move-in")}{" "}
            {app.moveInConfirmed
              ? formatPortalDate(app.moveInConfirmed)
              : app.moveInRequested
                ? formatPortalDate(app.moveInRequested)
                : t("Flexible")}
            <span className="mx-1.5">·</span>
            {t("Updated")} {formatPortalDate(app.lastUpdated)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-faint">
              {t("Transition")} {progress.done}/{progress.total}
              {progress.complete ? ` · ${t("ready to close")}` : ` · ${t("in progress")}`}
            </span>
          </div>
        </div>
      </div>
      <Button
        href={`/community/transition/${app.id}`}
        size="sm"
        className="shrink-0 self-start sm:self-center"
      >
        {progress.done > 0 ? t("Continue transition") : t("Open transition")}
      </Button>
    </article>
  );
}

function TransferCard({ transfer }: { transfer: PatientTransfer }) {
  const t = useT();
  const status = transferStatusMeta(transfer.status);
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line/80 bg-surface p-5 shadow-xs transition hover:border-line-strong hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {initialsFromName(transfer.residentName || "?")}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              {transfer.residentName || t("Untitled transfer")}
            </h3>
            <Badge tone={status.tone}>{t(status.label)}</Badge>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {transfer.destination
              ? `${t("To")} ${transfer.destination.name}`
              : t("No receiving center selected")}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {transfer.reasonId
              ? t(transferReasonLabel(transfer.reasonId))
              : t("Reason not set")}
            <span className="mx-1.5">·</span>
            {t("Updated")} {formatPortalDate(transfer.updatedAt)}
          </p>
        </div>
      </div>
      <Button
        href={`/community/transition/transfer/${transfer.id}`}
        size="sm"
        className="shrink-0 self-start sm:self-center"
      >
        {transfer.status === "draft" || transfer.status === "ready"
          ? t("Continue transfer")
          : t("Open transfer")}
      </Button>
    </article>
  );
}

export function CommunityTransitionBoard() {
  const t = useT();
  const { ready, workspace, can } = useCommunityPortal();

  const apps = useMemo(() => {
    const list = workspace?.applications ?? [];
    return list
      .filter(isTransitionApplication)
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [workspace]);

  const transfers = useMemo(() => {
    const list = workspace?.patientTransfers ?? [];
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [workspace]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Opening transition workspace…")}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("Workspace unavailable")}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t("We couldn’t open your community workspace. Refresh, or sign out and back in.")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[880px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">{t("Admissions")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">
            {t("Transition")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            {t(
              "Manage move-in transitions for accepted candidates, and create patient transfers to send clinical packets to another center.",
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {can("acceptDecline") ? (
              <Button href="/community/transition/transfer/new" size="sm">
                {t("New patient transfer")}
              </Button>
            ) : null}
            <Button href="/community/dashboard" size="sm" variant="secondary">
              {t("Review queue")}
            </Button>
            <Button href="/community/applications?filter=history" size="sm" variant="ghost">
              {t("History")}
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {t("Patient transfers")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {t(
                  "Inter-facility transfers with reason, clinical packet, and receiving center.",
                )}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums text-ink">
              {transfers.length} {t("transfer")}
              {transfers.length === 1 ? "" : "s"}
            </p>
          </div>

          {transfers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
              <p className="text-base font-semibold text-ink">
                {t("No patient transfers yet")}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                {t(
                  "Create a transfer when a resident needs to move to another facility — select the center, reason, and clinical information to share.",
                )}
              </p>
              {can("acceptDecline") ? (
                <Button href="/community/transition/transfer/new" size="sm" className="mt-5">
                  {t("Create patient transfer")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((xfer) => (
                <TransferCard key={xfer.id} transfer={xfer} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {t("Move-in transitions")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {t(
                  "Accepted candidates preparing for move-in — contracts, deposits, and arrival details.",
                )}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums text-ink">
              {apps.length} {t("dossier")}
              {apps.length === 1 ? "" : "s"}
            </p>
          </div>

          {apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
              <p className="text-base font-semibold text-ink">
                {t("No dossiers in transition")}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                {t(
                  "When you accept a candidate from the review queue, they appear here until contracts, payment, and move-in details are complete.",
                )}
              </p>
              <Button href="/community/dashboard" size="sm" className="mt-5">
                {t("Go to review queue")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <TransitionCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-ink-faint">
          {t("Need to message a family?")}{" "}
          <Link href="/community/messages" className="font-medium text-brand hover:underline">
            {t("Open messages")}
          </Link>
        </p>
      </div>
    </div>
  );
}
