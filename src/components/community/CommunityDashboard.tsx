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
import { ProfileAvatar } from "@/components/ProfilePhotoPicker";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

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
  const t = useT();
  const priority = applicationPriority(app);
  const progress = reviewChecklistProgress(app);
  return (
    <article className="flex flex-col gap-[18px] rounded-[18px] border border-line bg-surface p-5 shadow-xs transition hover:border-line-strong hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-[18px]">
        <ProfileAvatar
          photoUrl={app.seniorPhotoUrl}
          initials={initialsFromName(app.seniorName)}
          size={48}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-ink">
              {app.seniorName}
            </h3>
            <Badge tone={priorityTone(priority)}>{priorityBadgeLabel(priority)}</Badge>
          </div>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            {applicationCareType(app)}
            <span className="mx-1.5">·</span>
            {app.moveInRequested
              ? formatPortalDate(app.moveInRequested)
              : t("Flexible")}
            <span className="mx-1.5">·</span>
            {formatPortalDate(app.submittedAt)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-bg-soft">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress.complete ? "bg-success" : "bg-brand",
                )}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span
              className={cn(
                "text-xs tabular-nums",
                progress.complete ? "text-success" : "text-ink-faint",
              )}
            >
              {t("Review")} {progress.done}/{progress.total}
              {progress.complete
                ? ` · ${t("ready to decide")}`
                : ` · ${t("in progress")}`}
            </span>
          </div>
        </div>
      </div>
      <Button
        href={`/community/applications/${app.id}`}
        size="sm"
        className="shrink-0 self-start sm:self-center"
      >
        {progress.done > 0 ? t("Continue review") : t("Start review")}
      </Button>
    </article>
  );
}

export function CommunityDashboard() {
  const t = useT();
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

  const queueStats = useMemo(() => {
    const queue = [...grouped.high, ...grouped.medium, ...grouped.low];
    const ms48 = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const awaiting = queue.length;
    const waitingOver48h = queue.filter(
      (a) => now - new Date(a.submittedAt).getTime() > ms48,
    ).length;
    const checklistReady = queue.filter((a) => reviewChecklistProgress(a).complete).length;
    const highPriority = grouped.high.length;

    return [
      { k: awaiting, v: "Awaiting review" },
      { k: waitingOver48h, v: "Submitted over 48h ago" },
      { k: checklistReady, v: "Checklist complete" },
      { k: highPriority, v: "High priority" },
    ].filter((s) => Number.isFinite(s.k));
  }, [grouped]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Opening admissions…")}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="text-[36px] font-semibold tracking-[-0.025em] text-ink">
          {t("Admissions workspace unavailable")}
        </h1>
        <p className="text-[15px] text-ink-muted">
          {t(
            "We couldn’t open your community workspace. Refresh the page, or sign out and back in.",
          )}
        </p>
        <Button href="/community/dashboard" size="sm">
          {t("Try again")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-5 py-8 md:px-8 md:py-12">
        <header className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              {t("Admissions")}
            </p>
            <h1 className="mt-1 text-[36px] font-semibold tracking-[-0.025em] text-ink">
              {t("Review queue")}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              {t(
                "Admissions in progress, open each case, complete the guided checklist, then accept or",
              )}{" "}
              decline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/community/transition" size="sm" variant="secondary">
              {t("Transition (accepted)")}
            </Button>
            <Button href="/community/applications?filter=history" size="sm" variant="ghost">
              {t("History")}
            </Button>
          </div>
        </header>

        {queueStats.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {queueStats.map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-line bg-surface p-5 shadow-xs"
              >
                <p className="text-3xl font-semibold tracking-[-0.02em] text-ink tabular-nums">
                  {s.k}
                </p>
                <p className="mt-1.5 text-[15px] text-ink-muted">{t(s.v)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {unreadNotifications.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-brand/25 bg-brand-soft/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[17px] font-semibold tracking-[-0.025em] text-ink">
                  {unreadNotifications.length} {t("new application")}
                  {unreadNotifications.length === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-[15px] text-ink-muted">
                  {t("Submitted by families via Haven.")}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={markAllNotificationsRead}>
                {t("Dismiss all")}
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {unreadNotifications.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-line bg-surface/90 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">{n.title}</p>
                    <p className="text-sm text-ink-muted">{n.body}</p>
                  </div>
                  <Link
                    href={`/community/applications/${n.applicationId}`}
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-strong"
                  >
                    {t("Review")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => {
            const list = grouped[section.id];
            return (
              <section key={section.id} className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", section.dot)}
                    aria-hidden
                  />
                  <div>
                    <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
                      {t(section.title)}
                      <span className="ml-2 text-[15px] font-normal tabular-nums text-ink-faint">
                        {list.length}
                      </span>
                    </h2>
                    <p className="mt-0.5 text-[15px] text-ink-muted">{t(section.hint)}</p>
                  </div>
                </div>
                {list.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[15px] text-ink-faint">
                    {t("No applications in this queue.")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
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
