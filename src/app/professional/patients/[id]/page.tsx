"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  APPLICATION_STATUS_LABEL,
  CHECKLIST_LABEL,
  DOC_CATEGORY_LABEL,
  PATIENT_STATUS_LABEL,
  missingChecklist,
  patientName,
  statusTone,
  type ChecklistKey,
  type DocCategory,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { formatRelative } from "@/lib/format-relative";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const tabs = [
  "overview",
  "care",
  "documents",
  "applications",
  "timeline",
  "messages",
] as const;

type Tab = (typeof tabs)[number];

const careFields = [
  ["diagnosis", "Diagnosis"],
  ["mobility", "Mobility"],
  ["memory", "Memory"],
  ["behaviour", "Behaviour"],
  ["fallRisk", "Fall risk"],
  ["continence", "Continence"],
  ["medicationAssistance", "Medication assistance"],
  ["adls", "ADLs"],
  ["requiredCareLevel", "Required care level"],
  ["specialEquipment", "Special equipment"],
  ["diet", "Diet"],
  ["language", "Language"],
  ["insurance", "Insurance"],
  ["budget", "Budget"],
  ["preferredRegion", "Preferred region"],
  ["notes", "Notes"],
] as const;

function PatientDetailInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { getPatient, addMessage } = useProfessional();
  const patient = getPatient(id);
  const initialTab = (params.get("tab") as Tab | null) || "overview";
  const [tab, setTab] = useState<Tab>(tabs.includes(initialTab) ? initialTab : "overview");
  const [draft, setDraft] = useState("");

  const missing = useMemo(() => (patient ? missingChecklist(patient) : []), [patient]);

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-ink-muted">Patient not found.</p>
        <Button href="/professional/patients" className="mt-4" variant="secondary">
          Back to patients
        </Button>
      </div>
    );
  }

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addMessage(patient.id, draft);
    setDraft("");
  };

  const docsByCategory = (Object.keys(DOC_CATEGORY_LABEL) as DocCategory[]).map((cat) => ({
    cat,
    docs: patient.documents.filter((d) => d.category === cat),
  }));

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 md:px-8">
      <PageHeader
        title={patientName(patient)}
        description={`${patient.age} yrs · ${patient.currentLocation} · Family: ${patient.familyContact}`}
        breadcrumbs={[
          { label: "Patients", href: "/professional/patients" },
          { label: patientName(patient) },
        ]}
        actions={
          <Button href={`/professional/communities?patient=${patient.id}`}>
            Find communities
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition",
              tab === t
                ? "bg-brand text-white"
                : "bg-bg-soft text-ink-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Placement status
            </p>
            <div className="mt-3">
              <Badge tone={statusTone(patient.status)} className="text-sm">
                {PATIENT_STATUS_LABEL[patient.status]}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-ink-muted">{patient.nextAction}</p>
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ["Hospital", patient.hospital],
                ["Unit", patient.unit || "—"],
                ["Professional", patient.assignedProfessional],
                ["Emergency", `${patient.emergencyContact} · ${patient.emergencyPhone}`],
                ["Family", `${patient.familyContact} (${patient.familyRelation})`],
                ["Language", patient.language],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line/70 pb-2">
                  <dt className="text-ink-faint">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Readiness checklist
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {missing.length === 0 ? "Ready to apply" : "Waiting for documents"}
                </p>
              </div>
              <span className="text-sm text-ink-muted">
                {7 - missing.length}/7 complete
              </span>
            </div>
            <ul className="mt-6 space-y-2.5">
              {(Object.keys(CHECKLIST_LABEL) as ChecklistKey[]).map((key) => {
                const done = patient.checklist[key];
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-xl bg-bg-soft/80 px-3.5 py-2.5 text-sm"
                  >
                    <span className={done ? "text-ink" : "text-ink-muted"}>
                      {CHECKLIST_LABEL[key]}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        done ? "text-success" : "text-warn",
                      )}
                    >
                      {done ? "Complete" : "Missing"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "care" ? (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Care profile</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Structured fields for quick community review.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {careFields.map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-line bg-bg-soft/50 px-3.5 py-3"
              >
                <p className="text-xs font-medium text-ink-faint">{label}</p>
                <p className="mt-1 text-sm text-ink">{patient.care[key] || "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "documents" ? (
        <div className="mt-8 space-y-4">
          {docsByCategory.map(({ cat, docs }) => (
            <Card key={cat} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">{DOC_CATEGORY_LABEL[cat]}</h3>
                <span className="text-xs text-ink-faint">
                  {docs.length ? `${docs.length} file${docs.length > 1 ? "s" : ""}` : "Missing"}
                </span>
              </div>
              {docs.length === 0 ? (
                <p className="mt-3 text-sm text-warn">No document uploaded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg-soft/70 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-ink">{d.name}</p>
                        <p className="text-xs text-ink-faint">
                          {d.uploadedBy} · {formatRelative(d.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={d.verified ? "success" : "warn"}>
                          {d.verified ? "Verified" : "Needs review"}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          Preview
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "applications" ? (
        <div className="mt-8 space-y-3">
          {patient.applications.length === 0 ? (
            <Card className="p-6 text-sm text-ink-muted">
              No applications yet.{" "}
              <Link
                href={`/professional/communities?patient=${patient.id}`}
                className="font-medium text-brand hover:underline"
              >
                Browse communities
              </Link>
            </Card>
          ) : (
            patient.applications.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{a.communityName}</p>
                    <p className="mt-1 text-sm text-ink-muted">{a.nextAction}</p>
                  </div>
                  <Badge tone={statusTone(a.status)}>
                    {APPLICATION_STATUS_LABEL[a.status]}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-ink-secondary sm:grid-cols-3">
                  <p>Submitted · {a.submittedAt ? formatRelative(a.submittedAt) : "—"}</p>
                  <p>Staff · {a.assignedStaff}</p>
                  <p className="truncate">Last · {a.lastMessage}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "timeline" ? (
        <Card className="mt-8 p-6">
          <ol className="space-y-0">
            {[...patient.timeline]
              .sort((a, b) => +new Date(b.at) - +new Date(a.at))
              .map((event, i, arr) => (
                <li key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                    {i < arr.length - 1 ? (
                      <span className="my-1 w-px flex-1 bg-line" />
                    ) : null}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-ink">{event.label}</p>
                    {event.detail ? (
                      <p className="mt-0.5 text-sm text-ink-muted">{event.detail}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-faint">{formatRelative(event.at)}</p>
                  </div>
                </li>
              ))}
          </ol>
        </Card>
      ) : null}

      {tab === "messages" ? (
        <Card className="mt-8 flex min-h-[420px] flex-col p-0">
          <div className="border-b border-line px-5 py-4">
            <p className="font-semibold text-ink">Patient conversation</p>
            <p className="text-sm text-ink-muted">
              Professional, family, and communities in one thread.
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {patient.messages.length === 0 ? (
              <p className="text-sm text-ink-muted">No messages yet.</p>
            ) : (
              patient.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.from === "professional"
                      ? "ml-auto bg-brand text-white"
                      : "bg-bg-soft text-ink",
                  )}
                >
                  <p className="text-[11px] opacity-80">{m.fromName}</p>
                  <p className="mt-1">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{formatRelative(m.at)}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={onSend} className="flex gap-2 border-t border-line p-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              className="flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <Button type="submit" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <PatientDetailInner />
    </Suspense>
  );
}
