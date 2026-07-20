"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { computeDashboardStats } from "@/lib/community-portal";

export default function CommunityAnalyticsPage() {
  const { ready, workspace } = useCommunityPortal();

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading analytics…
      </div>
    );
  }

  const stats = computeDashboardStats(workspace);
  const rows = [
    ["Conversion rate", `${stats.conversionRate}%`],
    ["Avg. response time", `${stats.avgResponseHours} hours`],
    ["Open applications", String(stats.pendingReview)],
    ["Places available", String(stats.openBeds)],
    ["Waitlist size", String(stats.waitlistTotal)],
    ["Document requests open", String(stats.documentRequests)],
    ["Tours proposed", String(stats.upcomingVisits)],
    ["Assessments in flight", String(stats.assessmentsToSchedule)],
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Analytics"
        description="Admissions performance for your community."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Analytics" },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-2xl font-semibold">{v}</p>
            <p className="mt-1 text-sm text-ink-muted">{l}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
