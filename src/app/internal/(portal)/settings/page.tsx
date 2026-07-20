"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { formatAdminTime } from "@/lib/internal-admin";

export default function Page() {
  const { ready, workspace } = useInternalAdmin();
  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Settings"
        description="Internal console preferences."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Settings" },
        ]}
      />
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-sm text-ink-muted">Workspace updated</p>
          <p className="font-semibold">{formatAdminTime(workspace.updatedAt)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Audit events retained</p>
          <p className="font-semibold">{workspace.auditLog.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/internal/audit-logs" size="sm" variant="secondary">
            Open audit logs
          </Button>
          <Button href="/internal/reports" size="sm" variant="secondary">
            Analytics
          </Button>
        </div>
      </Card>
    </div>
  );
}
