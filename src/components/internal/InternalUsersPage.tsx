"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { formatAdminTime } from "@/lib/internal-admin";
import { cn } from "@/lib/utils";

function roleTone(role: string): "brand" | "accent" | "neutral" {
  if (role === "internal") return "brand";
  if (role === "community") return "accent";
  return "neutral";
}

function statusTone(status: string): "success" | "danger" | "warn" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  return "warn";
}

export function InternalUsersPage() {
  const { ready, workspace, suspendUser, reactivateUser } = useInternalAdmin();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const users = useMemo(() => {
    if (!workspace) return [];
    let list = [...workspace.users];
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (u.organization || "").toLowerCase().includes(query),
      );
    }
    return list;
  }, [workspace, q, roleFilter]);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading users…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Users"
        description="Search accounts, verify roles, suspend or reactivate access, and review incidents."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Users" },
        ]}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm sm:max-w-sm"
          placeholder="Search name, email, org…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {["all", "family", "community", "internal"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
                roleFilter === r
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-bg-soft",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{u.name}</p>
                  <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                  <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                  {u.incidentCount > 0 && (
                    <Badge tone="danger">{u.incidentCount} incident(s)</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{u.email}</p>
                {u.organization && (
                  <p className="text-sm text-ink-muted">{u.organization}</p>
                )}
                <p className="mt-2 text-xs text-ink-faint">
                  Registered {formatAdminTime(u.registeredAt)}
                  {u.lastLoginAt
                    ? ` · Last login ${formatAdminTime(u.lastLoginAt)}`
                    : " · Never logged in"}
                </p>
                {u.notes && (
                  <p className="mt-2 text-sm text-warn">Incidents / notes: {u.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {u.status !== "suspended" && u.role !== "internal" && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const reason = window.prompt("Suspension reason (optional)") || undefined;
                      suspendUser(u.id, reason);
                    }}
                  >
                    Suspend
                  </Button>
                )}
                {u.status === "suspended" && (
                  <Button size="sm" onClick={() => reactivateUser(u.id)}>
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
