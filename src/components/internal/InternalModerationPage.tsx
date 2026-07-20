"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import {
  MODERATION_KIND_LABELS,
  formatAdminTime,
  type ModerationKind,
} from "@/lib/internal-admin";

export function InternalModerationPage() {
  const { ready, workspace, resolveModeration } = useInternalAdmin();
  const [kind, setKind] = useState<"all" | ModerationKind>("all");
  const [onlyOpen, setOnlyOpen] = useState(true);

  const items = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.moderation];
    if (onlyOpen) list = list.filter((m) => m.status === "open");
    if (kind !== "all") list = list.filter((m) => m.kind === kind);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [workspace, kind, onlyOpen]);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading moderation…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Moderation"
        description="Reviews, photos, descriptions, reports, messages, fake profiles, and misleading claims."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Content" },
        ]}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              kind === "all"
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft"
            }`}
          >
            All types
          </button>
          {(Object.keys(MODERATION_KIND_LABELS) as ModerationKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                kind === k
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-bg-soft"
              }`}
            >
              {MODERATION_KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Open only
        </label>
      </div>

      <div className="space-y-3">
        {items.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{m.title}</p>
                  <Badge tone="neutral">{MODERATION_KIND_LABELS[m.kind]}</Badge>
                  <Badge
                    tone={
                      m.severity === "high"
                        ? "danger"
                        : m.severity === "medium"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {m.severity}
                  </Badge>
                  <Badge
                    tone={
                      m.status === "open"
                        ? "warn"
                        : m.status === "resolved"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Target: {m.target} · Reporter: {m.reporter}
                </p>
                <p className="mt-2 text-sm">{m.summary}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  {formatAdminTime(m.createdAt)}
                </p>
              </div>
              {m.status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolveModeration(m.id, "resolved")}>
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolveModeration(m.id, "dismissed")}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">Nothing in this queue.</Card>
        )}
      </div>
    </div>
  );
}
