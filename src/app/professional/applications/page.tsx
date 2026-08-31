"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/format-relative";
import {
  APPLICATION_STATUS_LABEL,
  allApplications,
  patientName,
  statusTone,
  type ApplicationStatus,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { useT } from "@/lib/i18n/locale";

function ApplicationsInner() {
  const t = useT();
  const { patients } = useProfessional();
  const params = useSearchParams();
  const initial = (params.get("status") as ApplicationStatus | null) || "all";
  const [status, setStatus] = useState<ApplicationStatus | "all">(
    initial === "all" || APPLICATION_STATUS_LABEL[initial as ApplicationStatus]
      ? (initial as ApplicationStatus | "all")
      : "all",
  );

  const rows = useMemo(() => {
    const list = allApplications(patients).sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
    if (status === "all") return list;
    return list.filter((a) => a.status === status);
  }, [patients, status]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
      <PageHeader
        title={t("Applications")}
        description="Every community submission across your caseload, in one place."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Applications" },
        ]}
      />

      <div className="mb-5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | "all")}
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          {(Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="hidden grid-cols-[1.1fr_1.2fr_1fr_0.9fr_1fr_1.2fr] gap-3 border-b border-line bg-bg-soft/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint lg:grid">
          <span>Patient</span>
          <span>Community</span>
          <span>Status</span>
          <span>Submitted</span>
          <span>Next action</span>
          <span>Last message</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/professional/patients/${a.patientId}?tab=applications`}
                className="grid gap-2 px-4 py-3.5 transition hover:bg-bg-soft/60 lg:grid-cols-[1.1fr_1.2fr_1fr_0.9fr_1fr_1.2fr] lg:items-center lg:gap-3"
              >
                <p className="font-medium text-ink">{patientName(a.patient)}</p>
                <p className="text-sm text-ink-secondary">{a.communityName}</p>
                <Badge tone={statusTone(a.status)}>{APPLICATION_STATUS_LABEL[a.status]}</Badge>
                <p className="text-sm text-ink-muted">
                  {a.submittedAt ? formatRelative(a.submittedAt) : "-"}
                </p>
                <p className="text-sm text-ink-muted">{a.nextAction}</p>
                <p className="truncate text-sm text-ink-faint">{a.lastMessage}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-sm text-ink-muted">
          {t("No applications match this filter.")}
        </Card>
      ) : null}
    </div>
  );
}

export default function ProfessionalApplicationsPage() {

  const t = useT();  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <ApplicationsInner />
    </Suspense>
  );
}
