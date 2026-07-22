"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";

export default function ProfessionalSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <PageHeader
        title="Settings"
        description="Account basics for your care professional workspace."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Settings" },
        ]}
      />

      <Card className="space-y-4 p-6 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Signed in as
          </p>
          <p className="mt-2 font-medium text-ink">{user?.name}</p>
          <p className="text-ink-muted">{user?.email}</p>
        </div>
        <div className="border-t border-line pt-4">
          <p className="text-ink-muted">
            Notifications, team invites, and organization preferences will live here as the
            professional portal grows. For now, your role and organization are saved with your
            HavenApply account.
          </p>
        </div>
      </Card>
    </div>
  );
}
