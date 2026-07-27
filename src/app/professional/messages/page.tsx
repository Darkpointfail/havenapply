"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/format-relative";
import { patientName } from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

export default function ProfessionalMessagesPage() {

  const t = useT();  const { patients } = useProfessional();
  const threads = useMemo(
    () =>
      patients
        .filter((p) => p.messages.length > 0)
        .map((p) => ({
          patient: p,
          last: p.messages[p.messages.length - 1],
        }))
        .sort((a, b) => +new Date(b.last.at) - +new Date(a.last.at)),
    [patients],
  );
  const [activeId, setActiveId] = useState(threads[0]?.patient.id || "");
  const active = patients.find((p) => p.id === activeId) || threads[0]?.patient;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
      <PageHeader
        title={t("Messages")}
        description="One conversation per patient, with family and communities together."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Messages" },
        ]}
      />

      <div className="grid min-h-[520px] overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[0.9fr_1.3fr]">
        <aside className="border-b border-line lg:border-b-0 lg:border-r">
          <ul className="divide-y divide-line">
            {threads.map(({ patient, last }) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(patient.id)}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition",
                    active?.id === patient.id ? "bg-brand-soft/50" : "hover:bg-bg-soft",
                  )}
                >
                  <p className="font-medium text-ink">{patientName(patient)}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">{last.fromName}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{last.body}</p>
                </button>
              </li>
            ))}
            {threads.length === 0 ? (
              <li className="px-4 py-8 text-sm text-ink-muted">No conversations yet.</li>
            ) : null}
          </ul>
        </aside>

        <section className="flex flex-col">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="font-semibold text-ink">{patientName(active)}</p>
                  <p className="text-sm text-ink-muted">{active.currentLocation}</p>
                </div>
                <Link
                  href={`/professional/patients/${active.id}?tab=messages`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {t("Open folder")}
                </Link>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.from === "professional"
                        ? "ml-auto bg-brand text-white"
                        : "bg-bg-soft text-ink",
                    )}
                  >
                    <p className="text-[11px] opacity-80">{m.fromName}</p>
                    <p className="mt-1">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatRelative(m.at)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="m-5 p-6 text-sm text-ink-muted">Select a patient conversation.</Card>
          )}
        </section>
      </div>
    </div>
  );
}
