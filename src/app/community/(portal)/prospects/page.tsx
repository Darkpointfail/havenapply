"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { statusLabel, statusTone } from "@/lib/community-portal";

/** Early-stage applications as sales prospects */
export default function CommunityProspectsPage() {
  const { ready, workspace } = useCommunityPortal();

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading prospects…
      </div>
    );
  }

  const prospects = workspace.applications.filter((a) =>
    ["submitted", "received", "tour_requested", "under_review"].includes(a.status),
  );

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Prospects"
        description="Early-stage families exploring your community."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Prospects" },
        ]}
      />
      <div className="space-y-3">
        {prospects.map((a) => (
          <Link key={a.id} href={`/community/applications/${a.id}`}>
            <Card className="mb-3 p-4" hover>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.seniorName}</p>
                  <p className="text-sm text-ink-muted">
                    {a.family.name} · {a.family.phone}
                  </p>
                </div>
                <Badge tone={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
              </div>
            </Card>
          </Link>
        ))}
        {prospects.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">No active prospects.</Card>
        )}
      </div>
    </div>
  );
}
