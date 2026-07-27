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
  type QueueSection,
} from "@/lib/community-portal";
import { cn } from "@/lib/utils";

const SECTIONS: {
  id: QueueSection;
  title: string;
  hint: string;
  dot: string;
}[] = [
  {
    id: "high",
    title: "High priority",
    hint: "Hospital discharge, urgent referrals, or immediate placement.",
    dot: "bg-rose-500",
  },
  {
    id: "medium",
    title: "Medium priority",
    hint: "Standard applications ready for review.",
    dot: "bg-amber-500",
  },
  {
    id: "low",
    title: "Low priority",
    hint: "Flexible move-in dates, review when you have capacity.",
    dot: "bg-emerald-500",
  },
];

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

  const grouped = useMemo(() => {
    const map: Record<QueueSection, CommunityApplication[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const app of apps) {
      const section = queueSectionFor(app);
      if (section) map[section].push(app);
    }
    for (const key of Object.keys(map) as QueueSection[]) {
      map[key].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }
    return map;
  }, [apps]);

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

  const openCount =
    grouped.high.length + grouped.medium.length + grouped.low.length;

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[880px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">Admissions</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">
            Review queue
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Admissions in progress, open each case, complete the guided checklist, then accept or
            decline.
          </p>
          <p className="mt-3 text-xs tabular-nums text-ink-faint">
            {openCount} awaiting review
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/community/transition" size="sm" variant="secondary">
              Transition (accepted)
            </Button>
            <Button href="/community/applications?filter=history" size="sm" variant="ghost">
              History
            </Button>
          </div>
        </header>

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

        <div className="space-y-10">
          {SECTIONS.map((section) => {
            const list = grouped[section.id];
            return (
              <section key={section.id}>
                <div className="mb-4 flex items-start gap-2.5">
                  <span
                    className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", section.dot)}
                    aria-hidden
                  />
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-ink">
                      {section.title}
                      <span className="ml-2 text-sm font-normal tabular-nums text-ink-faint">
                        {list.length}
                      </span>
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-muted">{section.hint}</p>
                  </div>
                </div>
                {list.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
                    No applications in this queue.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {list.map((app) => (
                      <ApplicationCard key={app.id} app={app} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
