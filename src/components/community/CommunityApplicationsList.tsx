"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { formatPortalTime, statusLabel, statusTone } from "@/lib/community-portal";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "pending", label: "Pending" },
  { id: "docs", label: "Docs requested" },
  { id: "visits", label: "Visits" },
  { id: "waitlist", label: "Waitlist" },
] as const;

export function CommunityApplicationsList() {
  const { ready, workspace } = useCommunityPortal();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const apps = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.applications];
    if (filter === "new") {
      list = list.filter((a) => ["submitted", "received"].includes(a.status));
    } else if (filter === "pending") {
      list = list.filter((a) =>
        ["under_review", "received", "submitted", "more_info"].includes(a.status),
      );
    } else if (filter === "docs") {
      list = list.filter((a) => Boolean(a.documentRequest));
    } else if (filter === "visits") {
      list = list.filter((a) => Boolean(a.tourProposal));
    } else if (filter === "waitlist") {
      list = list.filter((a) => a.status === "waitlisted");
    }
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (a) =>
          a.seniorName.toLowerCase().includes(query) ||
          a.family.name.toLowerCase().includes(query) ||
          (a.assigneeName || "").toLowerCase().includes(query),
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
      <PageHeader
        title="Applications"
        description="Review incoming families, assign your team, and move admissions forward."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Applications" },
        ]}
      />

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
        {apps.map((a) => (
          <Link key={a.id} href={`/community/applications/${a.id}`}>
            <Card className="mb-3 p-4 transition hover:border-brand/40" hover>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{a.seniorName}</p>
                    <Badge tone={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
                    {a.waitlistPosition != null && (
                      <Badge tone="accent">Waitlist #{a.waitlistPosition}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {a.family.name} · {a.family.relationship}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink">{a.summary}</p>
                  <p className="mt-2 text-xs text-ink-faint">
                    Assignee: {a.assigneeName || "Unassigned"} · Updated{" "}
                    {formatPortalTime(a.lastUpdated)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  {a.documentRequest && <Badge tone="warn">Docs requested</Badge>}
                  {a.tourProposal && <Badge tone="accent">Visit proposed</Badge>}
                  {a.assessmentProposal && <Badge tone="brand">Assessment</Badge>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {apps.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">No applications in this view.</Card>
        )}
      </div>
    </div>
  );
}
