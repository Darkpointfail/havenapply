"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useProfessional } from "@/lib/professional-store";
import { useAuth } from "@/lib/auth";

export default function ProfessionalOrganizationPage() {
  const { organization, patients } = useProfessional();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <PageHeader
        title="My organization"
        description="Where you place from. Keep this simple — Haven is for admissions, not hospital ops."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "My Organization" },
        ]}
      />

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Organization
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{organization.name}</h2>
        <p className="mt-1 text-sm text-ink-muted">{organization.type}</p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-ink-faint">City</dt>
            <dd className="font-medium text-ink">{organization.city}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-ink-faint">Phone</dt>
            <dd className="font-medium text-ink">{organization.phone}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-ink-faint">Your role</dt>
            <dd className="font-medium text-ink">
              {user?.jobTitle || "Care professional"} · {user?.name || "You"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-ink-faint">Active patients</dt>
            <dd className="font-medium text-ink">{patients.length}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4 p-6">
        <p className="font-semibold text-ink">Units</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {organization.units.map((u) => (
            <li
              key={u}
              className="rounded-full bg-bg-soft px-3 py-1.5 text-sm text-ink-secondary"
            >
              {u}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
