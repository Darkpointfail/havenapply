"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { useT } from "@/lib/i18n/locale";

export default function Page() {

  const t = useT();  const { ready, workspace } = useInternalAdmin();
  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }
  const seniors = [
    { name: "Eleanor Martin", age: 84, family: "Claire Martin", city: "Austin, TX" },
    { name: "Robert Chen", age: 79, family: "Amy Chen", city: "Austin, TX" },
    { name: "Helen Brooks", age: 88, family: "Daniel Brooks", city: "Round Rock, TX" },
    { name: "James Ortega", age: 81, family: "Maria Ortega", city: "Cedar Park, TX" },
  ];
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Seniors")}
        description={`${workspace.analytics.seniors.toLocaleString()} senior profiles · ${workspace.analytics.profilesCompleted.toLocaleString()} completed. Identifiers minimized.`}
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Seniors" },
        ]}
      />
      <div className="space-y-3">
        {seniors.map((s) => (
          <Card key={s.name} className="p-4">
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm text-ink-muted">
              Age {s.age} · Family contact {s.family} · {s.city}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
