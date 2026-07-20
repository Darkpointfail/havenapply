"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
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
  const families = workspace.users.filter((u) => u.role === "family");
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Families"
        description={`${workspace.analytics.families.toLocaleString()} family accounts on the platform · showing directory sample.`}
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Families" },
        ]}
      />
      <div className="space-y-3">
        {families.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-ink-muted">{u.email}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  Joined {formatAdminTime(u.registeredAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={u.status === "active" ? "success" : "danger"}>
                  {u.status}
                </Badge>
                <Link href="/internal/users" className="text-sm text-brand hover:underline">
                  Manage
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
