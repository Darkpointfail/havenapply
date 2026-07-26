"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  applicationCareType,
  formatPortalDate,
  initialsFromName,
  isTransitionApplication,
  transitionChecklistProgress,
  type CommunityApplication,
} from "@/lib/community-portal";

function TransitionCard({ app }: { app: CommunityApplication }) {
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
            <Badge tone="success">Accepted</Badge>
            {app.status === "move_in_scheduled" ? (
              <Badge tone="brand">Move-in scheduled</Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {applicationCareType(app)} · {app.family.name}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Preferred move-in{" "}
            {app.moveInConfirmed
              ? formatPortalDate(app.moveInConfirmed)
              : app.moveInRequested
                ? formatPortalDate(app.moveInRequested)
                : "Flexible"}
            <span className="mx-1.5">·</span>
            Updated {formatPortalDate(app.lastUpdated)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-faint">
              Transition {progress.done}/{progress.total}
              {progress.complete ? " · ready to close" : " · in progress"}
            </span>
          </div>
        </div>
      </div>
      <Button
        href={`/community/applications/${app.id}`}
        size="sm"
        className="shrink-0 self-start sm:self-center"
      >
        {progress.done > 0 ? "Continue transition" : "Open transition"}
      </Button>
    </article>
  );
}

export function CommunityTransitionBoard() {
  const { ready, workspace } = useCommunityPortal();

  const apps = useMemo(() => {
    const list = workspace?.applications ?? [];
    return list
      .filter(isTransitionApplication)
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [workspace]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Opening transition workspace…
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Workspace unavailable</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We couldn’t open your community workspace. Refresh, or sign out and back in.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[880px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">Admissions</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">
            Transition
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Accepted candidates preparing for move-in. Finish the residency agreement, deposit,
            family details, and move-in date — then close the dossier.
          </p>
          <p className="mt-3 text-sm font-medium tabular-nums text-ink">
            {apps.length} dossier{apps.length === 1 ? "" : "s"} in transition
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/community/dashboard" size="sm" variant="secondary">
              Review queue
            </Button>
            <Button href="/community/applications?filter=history" size="sm" variant="ghost">
              History
            </Button>
          </div>
        </header>

        {apps.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
            <p className="text-base font-semibold text-ink">No dossiers in transition</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              When you accept a candidate from the review queue, they appear here until contracts,
              payment, and move-in details are complete.
            </p>
            <Button href="/community/dashboard" size="sm" className="mt-5">
              Go to review queue
            </Button>
          </section>
        ) : (
          <section className="space-y-3">
            {apps.map((app) => (
              <TransitionCard key={app.id} app={app} />
            ))}
          </section>
        )}

        <p className="text-center text-xs text-ink-faint">
          Need to message a family?{" "}
          <Link href="/community/messages" className="font-medium text-brand hover:underline">
            Open messages
          </Link>
        </p>
      </div>
    </div>
  );
}
