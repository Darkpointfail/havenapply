"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { formatPortalTime, statusLabel, statusTone } from "@/lib/community-portal";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "pending", label: "In review" },
  { id: "info", label: "Need info" },
  { id: "decided", label: "Decided" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function ApplicationsListInner() {
  const params = useSearchParams();
  const initial = (params.get("filter") || "all") as FilterId;
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
    } else if (filter === "decided") {
      list = list.filter((a) =>
        ["approved", "declined", "conditionally_approved", "offer_received", "waitlisted"].includes(
          a.status,
        ),
      );
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

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-1 text-ink-muted">
          Complete digital admission packages. Review, message, decide.
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
            No applications in this view.
          </Card>
        ) : (
          apps.map((a) => (
            <Link key={a.id} href={`/community/applications/${a.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-brand/30 hover:shadow-xs">
                <div className="min-w-0">
                  <p className="font-semibold">{a.seniorName}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {a.family.name} · {a.relationship} · updated {formatPortalTime(a.lastUpdated)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(a.documentRequest || a.infoRequest) && (
                    <Badge tone="warn">Needs info</Badge>
                  )}
                  <Badge tone={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
                </div>
              </Card>
            </Link>
          ))
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
