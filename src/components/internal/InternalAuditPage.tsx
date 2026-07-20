"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import {
  AUDIT_TYPE_LABELS,
  formatAdminTime,
  type AuditActionType,
} from "@/lib/internal-admin";

export function InternalAuditPage() {
  const { ready, workspace } = useInternalAdmin();
  const [type, setType] = useState<"all" | AuditActionType>("all");
  const [q, setQ] = useState("");

  const logs = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.auditLog];
    if (type !== "all") list = list.filter((e) => e.actionType === type);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (e) =>
          e.actor.toLowerCase().includes(query) ||
          e.summary.toLowerCase().includes(query) ||
          e.resource.toLowerCase().includes(query),
      );
    }
    return list;
  }, [workspace, type, q]);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading audit logs…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Audit logs"
        description="Sensitive actions across the platform. Clinical and identity details stay redacted."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Audit logs" },
        ]}
      />

      <Card className="mb-4 border-brand/20 bg-brand-soft/30 p-4 text-sm text-ink">
        Logged: login · sensitive views · document add/delete · permission changes ·
        application submit · status changes · downloads · admin actions.
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm sm:max-w-sm"
          placeholder="Search actor, summary, resource…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as "all" | AuditActionType)}
        >
          <option value="all">All action types</option>
          {(Object.keys(AUDIT_TYPE_LABELS) as AuditActionType[]).map((t) => (
            <option key={t} value={t}>
              {AUDIT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {logs.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{AUDIT_TYPE_LABELS[e.actionType]}</Badge>
              <Badge tone="neutral">{e.actorRole}</Badge>
              <span className="text-xs text-ink-faint">{formatAdminTime(e.at)}</span>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{e.actor}</span> — {e.summary}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Resource: {e.resource}
              {e.ipHint ? ` · ${e.ipHint}` : ""}
            </p>
          </Card>
        ))}
        {logs.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">No matching audit events.</Card>
        )}
      </div>
    </div>
  );
}
