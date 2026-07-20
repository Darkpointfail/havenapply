"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  communityRoleLabel,
  formatPortalTime,
  statusLabel,
  statusTone,
} from "@/lib/community-portal";

export function CommunityDashboard() {
  const { ready, workspace, stats, myRole } = useCommunityPortal();

  if (!ready || !workspace || !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading community portal…
      </div>
    );
  }

  const metrics: { label: string; value: string; hint?: string; href?: string }[] = [
    {
      label: "New applications",
      value: String(stats.newApplications),
      href: "/community/applications",
    },
    {
      label: "Pending review",
      value: String(stats.pendingReview),
      href: "/community/applications",
    },
    {
      label: "Document requests",
      value: String(stats.documentRequests),
      href: "/community/applications",
    },
    {
      label: "Visits upcoming",
      value: String(stats.upcomingVisits),
    },
    {
      label: "Assessments to schedule",
      value: String(stats.assessmentsToSchedule),
    },
    {
      label: "Places available",
      value: String(stats.openBeds),
      href: "/community/availability",
    },
    {
      label: "Waitlist",
      value: String(stats.waitlistTotal),
      href: "/community/availability",
    },
    {
      label: "Conversion rate",
      value: `${stats.conversionRate}%`,
      hint: "Last 90 days",
    },
    {
      label: "Avg. response time",
      value: `${stats.avgResponseHours}h`,
      hint: "To first action",
    },
  ];

  const queue = [...workspace.applications]
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Dashboard"
        description={`${workspace.residenceName} · signed in as ${communityRoleLabel(myRole)}`}
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Dashboard" },
        ]}
        actions={
          <Button href="/community/applications" size="sm">
            Open applications
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const inner = (
            <>
              <p className="text-3xl font-semibold tracking-tight">{m.value}</p>
              <p className="mt-1 text-sm text-ink-muted">{m.label}</p>
              {m.hint && <p className="mt-0.5 text-xs text-ink-faint">{m.hint}</p>}
            </>
          );
          return m.href ? (
            <Link key={m.label} href={m.href}>
              <Card className="h-full p-5 transition hover:border-brand/40">{inner}</Card>
            </Link>
          ) : (
            <Card key={m.label} className="p-5">
              {inner}
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Application queue</h2>
            <Button href="/community/applications" size="sm" variant="ghost">
              View all
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {queue.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/community/applications/${a.id}`}
                  className="flex items-start justify-between gap-3 py-3 transition hover:bg-bg-soft/60"
                >
                  <div>
                    <p className="font-medium">{a.seniorName}</p>
                    <p className="text-sm text-ink-muted">
                      {a.family.name} · {a.assigneeName || "Unassigned"}
                    </p>
                  </div>
                  <Badge tone={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Recent audit</h2>
          <ul className="space-y-3">
            {[...workspace.auditLog].reverse().slice(0, 8).map((e) => (
              <li key={e.id} className="text-sm">
                <p>
                  <span className="font-medium">{e.actor}</span> — {e.action}
                </p>
                <p className="text-xs text-ink-faint">{formatPortalTime(e.at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
