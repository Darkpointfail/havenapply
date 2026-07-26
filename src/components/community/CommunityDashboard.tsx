"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  applicationCareType,
  applicationPriority,
  formatPortalDate,
  initialsFromName,
  priorityBadgeLabel,
  queueSectionFor,
  reviewChecklistProgress,
  type AdmissionPriority,
  type CommunityApplication,
} from "@/lib/community-portal";

function priorityTone(p: AdmissionPriority) {
  if (p === "high") return "danger" as const;
  if (p === "medium") return "warn" as const;
  return "success" as const;
}

function ApplicationCard({ app }: { app: CommunityApplication }) {
  const priority = applicationPriority(app);
  const progress = reviewChecklistProgress(app);
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
            <Badge tone={priorityTone(priority)}>{priorityBadgeLabel(priority)}</Badge>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">{applicationCareType(app)}</p>
          <p className="mt-1 text-xs text-ink-faint">
            Move-in requested{" "}
            {app.moveInRequested ? formatPortalDate(app.moveInRequested) : "Flexible"}
            <span className="mx-1.5">·</span>
            Submitted {formatPortalDate(app.submittedAt)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-faint">
              Review {progress.done}/{progress.total}
              {progress.complete ? " · ready to decide" : " · in progress"}
            </span>
          </div>
        </div>
      </div>
      <Button
        href={`/community/applications/${app.id}`}
        size="sm"
        className="shrink-0 self-start sm:self-center"
      >
        {progress.done > 0 ? "Continue review" : "Start review"}
      </Button>
    </article>
  );
}

export function CommunityDashboard() {
  const {
    ready,
    workspace,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useCommunityPortal();

  const apps = workspace?.applications ?? [];
  const openApps = useMemo(
    () =>
      apps
        .filter((a) => queueSectionFor(a) != null)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [apps],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Opening admissions…
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Admissions workspace unavailable</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We couldn’t open your community workspace. Refresh the page, or sign out and back in.
        </p>
        <Button href="/community/dashboard" className="mt-6" size="sm">
          Try again
        </Button>
      </div>
    );
  }

  const openCount = openApps.length;

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[880px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">Admissions</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">
            Dossiers in progress
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Open cases awaiting your decision. Click a candidate, complete the 6-point checklist,
            then accept or decline.
          </p>
          <p className="mt-3 text-sm font-medium tabular-nums text-ink">
            {openCount} open dossier{openCount === 1 ? "" : "s"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/community/applications?filter=open" size="sm" variant="secondary">
              All open applications
            </Button>
            <Button href="/community/applications?filter=history" size="sm" variant="ghost">
              History
            </Button>
          </div>
        </header>

        {openCount === 0 ? (
          <section className="rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
            <p className="text-base font-semibold text-ink">No dossiers in progress</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              When families apply, their packets appear here. Refresh if you just created this
              community account.
            </p>
            <Button href="/community/dashboard" size="sm" className="mt-5">
              Refresh queue
            </Button>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="mb-1">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Open now</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Start or continue the guided review for each candidate.
              </p>
            </div>
            {openApps.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </section>
        )}

        {unreadNotifications.length > 0 && (
          <section className="rounded-2xl border border-brand/25 bg-brand-soft/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {unreadNotifications.length} new application
                  {unreadNotifications.length === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Submitted by families via Haven.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={markAllNotificationsRead}
              >
                Dismiss all
              </Button>
            </div>
            <ul className="mt-3 space-y-2">
              {unreadNotifications.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    <p className="text-xs text-ink-muted">{n.body}</p>
                  </div>
                  <Link
                    href={`/community/applications/${n.applicationId}`}
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-[10px] bg-brand px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-strong"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
