"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, FileWarning, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/format-relative";
import {
  PATIENT_STATUS_LABEL,
  missingChecklist,
  patientName,
  statusTone,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { useT } from "@/lib/i18n/locale";

export default function ProfessionalDashboardPage() {

  const t = useT();  const { patients } = useProfessional();

  const missingDocs = patients.filter((p) => missingChecklist(p).length > 0);
  const needMoreInfo = patients.filter((p) =>
    p.applications.some((a) => a.status === "need_more_info"),
  );
  const assessments = patients.filter((p) => p.status === "assessment_scheduled");
  const waitingReview = patients.filter((p) =>
    p.applications.some((a) => a.status === "under_review" || a.status === "submitted"),
  );
  const ready = patients.filter((p) => p.status === "ready_to_apply");
  const recentMessages = patients
    .flatMap((p) =>
      p.messages.slice(-1).map((m) => ({
        patientId: p.id,
        patient: patientName(p),
        ...m,
      })),
    )
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 4);

  const priorities = [
    {
      label: "Patients missing documents",
      count: missingDocs.length,
      href: "/professional/patients?status=waiting_documents",
      icon: FileWarning,
    },
    {
      label: "Communities requested more information",
      count: needMoreInfo.length,
      href: "/professional/applications?status=need_more_info",
      icon: ClipboardList,
    },
    {
      label: "Assessments scheduled",
      count: assessments.length,
      href: "/professional/patients?status=assessment_scheduled",
      icon: ClipboardList,
    },
    {
      label: "Applications waiting for review",
      count: waitingReview.length,
      href: "/professional/applications",
      icon: Send,
    },
  ];

  const sorted = [...patients].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
      <PageHeader
        title={t("Today’s priorities")}
        description="What needs attention to move patients toward the right senior living community."
        breadcrumbs={[{ label: "Care professional" }, { label: "Dashboard" }]}
        actions={
          <Button href="/professional/patients/new">
            {t("Add patient")}
            <ArrowRight size={16} />
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {priorities.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card className="h-full p-5 transition hover:border-brand/40 hover:shadow-soft" hover>
              <item.icon size={18} className="text-brand" />
              <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{item.count}</p>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{item.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {ready.length > 0 ? (
        <Card className="mt-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Ready to submit</p>
              <p className="mt-1 text-sm text-ink-muted">
                {ready.length} patient{ready.length === 1 ? "" : "s"} with a complete checklist.
              </p>
            </div>
            <Button href="/professional/patients?status=ready_to_apply" variant="secondary" size="sm">
              {t("Review")}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ready.map((p) => (
              <Link
                key={p.id}
                href={`/professional/patients/${p.id}`}
                className="rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success hover:brightness-95"
              >
                {patientName(p)}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Patients</h2>
            <Link href="/professional/patients" className="text-sm font-medium text-brand hover:underline">
              {t("View all")}
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_1.2fr_0.7fr] gap-3 border-b border-line bg-bg-soft/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint md:grid">
              <span>Patient</span>
              <span>Status</span>
              <span>Primary community</span>
              <span>Next action</span>
              <span>Updated</span>
            </div>
            <ul className="divide-y divide-line">
              {sorted.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/professional/patients/${p.id}`}
                    className="grid gap-2 px-4 py-3.5 transition hover:bg-bg-soft/60 md:grid-cols-[1.3fr_1fr_1fr_1.2fr_0.7fr] md:items-center md:gap-3"
                  >
                    <div>
                      <p className="font-medium text-ink">{patientName(p)}</p>
                      <p className="text-xs text-ink-muted">
                        {p.age} · {p.unit || p.currentLocation}
                      </p>
                    </div>
                    <div>
                      <Badge tone={statusTone(p.status)}>{PATIENT_STATUS_LABEL[p.status]}</Badge>
                    </div>
                    <p className="text-sm text-ink-secondary">{p.primaryCommunity || "—"}</p>
                    <p className="text-sm text-ink-muted">{p.nextAction}</p>
                    <p className="text-xs text-ink-faint">{formatRelative(p.updatedAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Recent messages</h2>
            <Link href="/professional/messages" className="text-sm font-medium text-brand hover:underline">
              Inbox
            </Link>
          </div>
          <div className="space-y-3">
            {recentMessages.length === 0 ? (
              <Card className="p-5 text-sm text-ink-muted">No recent messages.</Card>
            ) : (
              recentMessages.map((m) => (
                <Link key={m.id} href={`/professional/patients/${m.patientId}?tab=messages`}>
                  <Card className="p-4 transition hover:border-brand/30" hover>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <MessageSquare size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{m.patient}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">{m.fromName}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{m.body}</p>
                        <p className="mt-2 text-xs text-ink-faint">{formatRelative(m.at)}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
