"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { formatAdminTime } from "@/lib/internal-admin";

export function InternalOverview() {
  const { ready, workspace } = useInternalAdmin();

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading admin console…
      </div>
    );
  }

  const pendingCommunities = workspace.communities.filter(
    (c) => c.status === "pending_review",
  ).length;
  const openMod = workspace.moderation.filter((m) => m.status === "open").length;
  const blockedApps = workspace.applications.filter(
    (a) => a.health === "blocked" || a.health === "dispute",
  ).length;
  const suspendedUsers = workspace.users.filter((u) => u.status === "suspended").length;

  const tiles = [
    {
      label: "Families on platform",
      value: workspace.analytics.families.toLocaleString(),
      href: "/internal/families",
    },
    {
      label: "Active communities",
      value: String(workspace.analytics.activeCommunities),
      href: "/internal/communities",
    },
    {
      label: "Partnerships to review",
      value: String(pendingCommunities),
      href: "/internal/communities",
    },
    {
      label: "Open moderation",
      value: String(openMod),
      href: "/internal/content",
    },
    {
      label: "Blocked / dispute apps",
      value: String(blockedApps),
      href: "/internal/applications",
    },
    {
      label: "Suspended users",
      value: String(suspendedUsers),
      href: "/internal/users",
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Overview"
        description="Platform operations console, users, partnerships, admissions health, and audit."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Overview" },
        ]}
        actions={
          <Button href="/internal/audit-logs" size="sm" variant="secondary">
            Audit logs
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="h-full p-5 transition hover:border-brand/40">
              <p className="text-3xl font-semibold tracking-tight">{t.value}</p>
              <p className="mt-1 text-sm text-ink-muted">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Needs attention</h2>
          </div>
          <ul className="space-y-3 text-sm">
            {workspace.communities
              .filter((c) => c.status === "pending_review" || c.status === "suspended")
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    {c.name}{" "}
                    <Badge tone={c.status === "suspended" ? "danger" : "warn"}>
                      {c.status.replace("_", " ")}
                    </Badge>
                  </span>
                  <Link href="/internal/communities" className="text-brand hover:underline">
                    Review
                  </Link>
                </li>
              ))}
            {workspace.moderation
              .filter((m) => m.status === "open" && m.severity === "high")
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span>
                    {m.title} <Badge tone="danger">High</Badge>
                  </span>
                  <Link href="/internal/content" className="text-brand hover:underline">
                    Moderate
                  </Link>
                </li>
              ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Recent audit</h2>
          <ul className="space-y-3">
            {workspace.auditLog.slice(0, 8).map((e) => (
              <li key={e.id} className="text-sm">
                <p>
                  <span className="font-medium">{e.actor}</span>, {e.summary}
                </p>
                <p className="text-xs text-ink-faint">{formatAdminTime(e.at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
