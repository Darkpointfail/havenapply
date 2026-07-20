"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { communityRoleLabel, formatPortalTime } from "@/lib/community-portal";

export default function CommunitySettingsPage() {
  const { ready, workspace, myRole } = useCommunityPortal();

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Settings"
        description="Workspace preferences for your admissions team."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Settings" },
        ]}
      />
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-sm text-ink-muted">Community</p>
          <p className="font-semibold">{workspace.residenceName}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Your role</p>
          <p className="font-semibold">{communityRoleLabel(myRole)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Last workspace update</p>
          <p className="font-semibold">{formatPortalTime(workspace.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button href="/community/profile" size="sm" variant="secondary">
            Edit profile
          </Button>
          <Button href="/community/team" size="sm" variant="secondary">
            Manage team
          </Button>
          <Button href="/community/availability" size="sm" variant="secondary">
            Availability
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Sensitive action log</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Accept, decline, document requests, and profile changes are recorded.
        </p>
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {[...workspace.auditLog].reverse().slice(0, 20).map((e) => (
            <li key={e.id} className="text-sm">
              <span className="font-medium">{e.actor}</span> — {e.action}
              <span className="ml-2 text-xs text-ink-faint">
                {formatPortalTime(e.at)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
