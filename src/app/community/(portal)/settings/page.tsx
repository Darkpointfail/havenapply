"use client";

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
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[640px] space-y-8 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workspace</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Quiet controls for your admissions team, nothing operational.
          </p>
        </header>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3">
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-ink-muted">Community</span>
            <span className="font-medium text-ink">{workspace.residenceName}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-ink-muted">Your role</span>
            <span className="font-medium text-ink">{communityRoleLabel(myRole)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-ink-muted">Last updated</span>
            <span className="font-medium text-ink">
              {formatPortalTime(workspace.updatedAt)}
            </span>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button href="/community/profile" variant="secondary" size="sm">
            Edit community
          </Button>
          <Button href="/community/team" variant="secondary" size="sm">
            Manage team
          </Button>
          <Button href="/community/dashboard" size="sm">
            Back to admissions
          </Button>
        </div>
      </div>
    </div>
  );
}
