"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/format-relative";
import {
  PATIENT_STATUS_LABEL,
  type PatientStatus,
  patientName,
  statusTone,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

const statuses = Object.keys(PATIENT_STATUS_LABEL) as PatientStatus[];

function PatientsInner() {
  const t = useT();
  const { patients, organization } = useProfessional();
  const params = useSearchParams();
  const initialStatus = params.get("status") as PatientStatus | null;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PatientStatus | "all">(initialStatus || "all");
  const [unit, setUnit] = useState("all");
  const [priority, setPriority] = useState("all");

  const units = useMemo(
    () => Array.from(new Set(patients.map((p) => p.unit).filter(Boolean))),
    [patients],
  );

  const filtered = patients.filter((p) => {
    const hay = [
      patientName(p),
      p.familyContact,
      p.hospital,
      p.unit,
      p.primaryCommunity || "",
      PATIENT_STATUS_LABEL[p.status],
    ]
      .join(" ")
      .toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (status !== "all" && p.status !== status) return false;
    if (unit !== "all" && p.unit !== unit) return false;
    if (priority !== "all" && p.priority !== priority) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
      <PageHeader
        title={t("Patients")}
        description="Every admissions folder you’re preparing for senior living placement."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Patients" },
        ]}
        actions={
          <Button href="/professional/patients/new">
            <Plus size={16} />
            {t("Add patient")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search patient, family, hospital, community…")}
            className="w-full rounded-xl border border-line bg-bg px-9 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PatientStatus | "all")}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {PATIENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="all">All units</option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="soon">Soon</option>
          <option value="routine">Routine</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        {filtered.length} patient{filtered.length === 1 ? "" : "s"} · {organization.name}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {filtered.map((p) => (
          <Link key={p.id} href={`/professional/patients/${p.id}`}>
            <Card className="h-full p-5 transition hover:border-brand/35" hover>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{patientName(p)}</p>
                    <p className="text-sm text-ink-muted">
                      {p.age} yrs · {p.currentLocation}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone(p.status)}>{PATIENT_STATUS_LABEL[p.status]}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-ink-secondary">
                <p>
                  <span className="text-ink-faint">Family · </span>
                  {p.familyContact} ({p.familyRelation})
                </p>
                <p>
                  <span className="text-ink-faint">Next · </span>
                  {p.nextAction}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    p.priority === "urgent" && "bg-danger-soft text-danger",
                    p.priority === "soon" && "bg-warn-soft text-warn",
                    p.priority === "routine" && "bg-bg-soft text-ink-muted",
                  )}
                >
                  {p.priority}
                </span>
                <span>{formatRelative(p.updatedAt)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-sm text-ink-muted">
          {t("No patients match these filters.")}
        </Card>
      ) : null}
    </div>
  );
}

export default function ProfessionalPatientsPage() {

  const t = useT();  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <PatientsInner />
    </Suspense>
  );
}
