"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { AUDIT_TYPE_LABELS, formatAdminTime } from "@/lib/internal-admin";

export default function Page() {
  const { ready, workspace } = useInternalAdmin();
  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }
  const docs = workspace.auditLog.filter(
    (e) => e.actionType === "document_add" || e.actionType === "document_delete",
  );
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Documents"
        description={`${workspace.analytics.documentsAdded.toLocaleString()} documents added platform-wide. Event log only, file contents are not shown.`}
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Documents" },
        ]}
      />
      <div className="space-y-2">
        {docs.map((e) => (
          <Card key={e.id} className="p-4 text-sm">
            <p className="font-medium">
              {AUDIT_TYPE_LABELS[e.actionType]} · {e.actor}
            </p>
            <p className="mt-1 text-ink-muted">{e.summary}</p>
            <p className="mt-1 text-xs text-ink-faint">{formatAdminTime(e.at)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
