"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { formatAdminTime, type AppHealthStatus } from "@/lib/internal-admin";

function healthTone(
  h: AppHealthStatus,
): "success" | "warn" | "danger" | "accent" | "neutral" {
  switch (h) {
    case "on_track":
      return "success";
    case "awaiting_family":
    case "awaiting_community":
      return "warn";
    case "blocked":
    case "dispute":
      return "danger";
    case "closed":
      return "neutral";
    default:
      return "accent";
  }
}

export function InternalApplicationsPage() {
  const { ready, workspace, interveneApplication } = useInternalAdmin();
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const apps = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.applications];
    if (filter === "blocked") {
      list = list.filter((a) => a.health === "blocked" || a.health === "dispute");
    } else if (filter === "slow") {
      list = list.filter((a) => (a.responseHours ?? 0) > 24 || a.responseHours === null);
    }
    return list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }, [workspace, filter]);

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
        description="Monitor statuses, stalled files, response times, and disputes, without exposing sensitive clinical detail."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Applications" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {[
          { id: "all", label: "All" },
          { id: "blocked", label: "Blocked / disputes" },
          { id: "slow", label: "Slow response" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.id
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {apps.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{a.seniorName}</p>
                  <Badge tone="neutral">{a.status}</Badge>
                  <Badge tone={healthTone(a.health)}>
                    {a.health.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Family: {a.familyName} · Community: {a.communityName}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Submitted {formatAdminTime(a.submittedAt)} · Last activity{" "}
                  {formatAdminTime(a.lastActivityAt)}
                  {a.responseHours != null
                    ? ` · Community response ${a.responseHours}h`
                    : " · No community response yet"}
                </p>
                {a.disputeNote && (
                  <p className="mt-2 text-sm text-danger">{a.disputeNote}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                >
                  {openId === a.id ? "Hide log" : "Activity log"}
                </Button>
                {(a.health === "blocked" || a.health === "dispute") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const note =
                        window.prompt("Intervention note (stored redacted in family view)") ||
                        "";
                      if (note.trim()) interveneApplication(a.id, note);
                    }}
                  >
                    Intervene
                  </Button>
                )}
              </div>
            </div>
            {openId === a.id && (
              <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                {a.activityLog.map((e, i) => (
                  <li key={`${e.at}-${i}`}>
                    <span className="font-medium">{e.actor}</span>, {e.action}
                    <span className="ml-2 text-xs text-ink-faint">
                      {formatAdminTime(e.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
