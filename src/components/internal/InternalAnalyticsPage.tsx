"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { useT } from "@/lib/i18n/locale";

export function InternalAnalyticsPage() {

  const t = useT();  const { ready, workspace } = useInternalAdmin();

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading analytics…")}
      </div>
    );
  }

  const a = workspace.analytics;
  const kpis: { label: string; value: string }[] = [
    { label: "Families", value: a.families.toLocaleString() },
    { label: "Seniors", value: a.seniors.toLocaleString() },
    { label: "Profiles completed", value: a.profilesCompleted.toLocaleString() },
    { label: "Documents added", value: a.documentsAdded.toLocaleString() },
    { label: "Searches", value: a.searches.toLocaleString() },
    { label: "Favorites", value: a.favorites.toLocaleString() },
    { label: "Applications", value: a.applications.toLocaleString() },
    { label: "Response rate", value: `${a.responseRate}%` },
    { label: "Acceptance rate", value: `${a.acceptanceRate}%` },
    { label: "Avg. time to response", value: `${a.avgResponseHours}h` },
    { label: "Active communities", value: String(a.activeCommunities) },
    { label: "Abandoned funnels", value: a.abandonedFunnels.toLocaleString() },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Analytics")}
        description="Platform-wide funnel and admissions performance."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Reports" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-3xl font-semibold tracking-tight">{k.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{k.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-5">
        <h2 className="mb-4 font-semibold">Applications by community</h2>
        <ul className="space-y-3">
          {a.applicationsByCommunity.map((row) => {
            const pct = Math.round((row.count / a.applications) * 100);
            return (
              <li key={row.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="font-medium">
                    {row.count.toLocaleString()} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
