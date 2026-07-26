"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  formatPortalDate,
  formatPortalTime,
  isHistoryTerminalApplication,
  isTransitionApplication,
  statusLabel,
  statusTone,
  transitionChecklistProgress,
  type CommunityApplication,
} from "@/lib/community-portal";
import type { ApplicationStatus } from "@/data/applications";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "pending", label: "In review" },
  { id: "info", label: "Need info" },
  { id: "transition", label: "Transition" },
  { id: "history", label: "History" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function outcomeLabel(status: ApplicationStatus) {
  if (status === "approved" || status === "offer_received" || status === "move_in_scheduled") {
    return "Accepted · transition";
  }
  if (status === "conditionally_approved") return "Conditionally accepted";
  if (status === "declined") return "Declined";
  if (status === "waitlisted") return "Waitlisted";
  if (status === "withdrawn") return "Withdrawn";
  if (status === "closed") return "Closed";
  return statusLabel(status);
}

function outcomeTone(status: ApplicationStatus) {
  if (status === "approved" || status === "offer_received" || status === "move_in_scheduled") {
    return "success" as const;
  }
  if (status === "conditionally_approved" || status === "waitlisted") return "warn" as const;
  if (status === "declined" || status === "withdrawn" || status === "closed") {
    return "danger" as const;
  }
  return statusTone(status);
}

function decisionNote(app: CommunityApplication) {
  const hit = [...app.auditLog]
    .reverse()
    .find((e) => /accept|declin|waitlist|withdraw|approv/i.test(e.action));
  return hit?.action ?? null;
}

function ApplicationsListInner() {
  const params = useSearchParams();
  const raw = params.get("filter");
  const initial = (
    raw === "decided" ? "history" : raw || "all"
  ) as FilterId;
  const { ready, workspace } = useCommunityPortal();
  const [filter, setFilter] = useState<FilterId>(
    FILTERS.some((f) => f.id === initial) ? initial : "all",
  );
  const [q, setQ] = useState("");

  const apps = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.applications];
    if (filter === "new") {
      list = list.filter((a) => ["submitted", "received"].includes(a.status));
    } else if (filter === "pending") {
      list = list.filter((a) =>
        ["under_review", "assessment_requested", "tour_requested"].includes(a.status),
      );
    } else if (filter === "info") {
      list = list.filter(
        (a) =>
          a.status === "more_info" || Boolean(a.documentRequest) || Boolean(a.infoRequest),
      );
    } else if (filter === "transition") {
      list = list.filter(isTransitionApplication);
    } else if (filter === "history") {
      list = list.filter(isHistoryTerminalApplication);
    }
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (a) =>
          a.seniorName.toLowerCase().includes(query) ||
          a.family.name.toLowerCase().includes(query),
      );
    }
    return list.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [workspace, filter, q]);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading applications…
      </div>
    );
  }

  const isHistory = filter === "history";
  const isTransition = filter === "transition";

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isHistory
            ? "Application history"
            : isTransition
              ? "Transition"
              : "Applications"}
        </h1>
        <p className="mt-1 text-ink-muted">
          {isHistory
            ? "Closed, declined, or withdrawn dossiers. Accepted candidates stay in Transition until move-in is complete."
            : isTransition
              ? "Accepted dossiers still finishing contracts, payment, and family details before close."
              : "Complete digital admission packages. Review, message, decide."}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                filter === f.id
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-bg-soft",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm sm:max-w-xs"
          placeholder="Search senior or family…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">
            {isHistory
              ? "No archived dossiers yet. Closed and declined applications appear here."
              : isTransition
                ? "No dossiers in transition. Accept a candidate from Admissions to start move-in prep."
                : "No applications in this view."}
          </Card>
        ) : (
          apps.map((a) => {
            const note = isHistory ? decisionNote(a) : null;
            const tProgress = isTransition ? transitionChecklistProgress(a) : null;
            return (
              <Link key={a.id} href={`/community/applications/${a.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-brand/30 hover:shadow-xs">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.seniorName}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {a.family.name} · {a.relationship}
                      {a.careType ? ` · ${a.careType}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Applied {formatPortalDate(a.submittedAt)}
                      <span className="mx-1.5">·</span>
                      Updated {formatPortalTime(a.lastUpdated)}
                    </p>
                    {note ? (
                      <p className="mt-1.5 text-xs text-ink-secondary">{note}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isHistory && !isTransition && (a.documentRequest || a.infoRequest) && (
                      <Badge tone="warn">Needs info</Badge>
                    )}
                    {tProgress ? (
                      <Badge tone={tProgress.complete ? "success" : "brand"}>
                        Transition {tProgress.done}/{tProgress.total}
                      </Badge>
                    ) : (
                      <Badge tone={isHistory ? outcomeTone(a.status) : statusTone(a.status)}>
                        {isHistory ? outcomeLabel(a.status) : statusLabel(a.status)}
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CommunityApplicationsList() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <ApplicationsListInner />
    </Suspense>
  );
}
