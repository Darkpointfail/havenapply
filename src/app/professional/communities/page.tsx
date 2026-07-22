"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { residences } from "@/data/residences";
import { formatCurrency } from "@/lib/utils";
import { useProfessional } from "@/lib/professional-store";
import { patientName } from "@/lib/professional-data";

function CommunitiesInner() {
  const { patients, submitApplication } = useProfessional();
  const params = useSearchParams();
  const patientId = params.get("patient") || "";
  const patient = patients.find((p) => p.id === patientId);

  const [q, setQ] = useState("");
  const [care, setCare] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState(patientId);

  const list = useMemo(() => {
    return residences.filter((r) => {
      const hay = `${r.name} ${r.city} ${r.careLevels.join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (care !== "all" && !r.careLevels.includes(care as (typeof r.careLevels)[number])) {
        return false;
      }
      return true;
    });
  }, [q, care]);

  const activePatient = patients.find((p) => p.id === selectedPatient) || patient;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
      <PageHeader
        title="Communities"
        description="Find senior living options that fit care needs, then apply with the same patient profile."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Communities" },
        ]}
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities…"
            className="w-full rounded-xl border border-line bg-bg px-9 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={care}
          onChange={(e) => setCare(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="all">All care levels</option>
          <option value="Assisted living">Assisted living</option>
          <option value="Memory care">Memory care</option>
          <option value="Nursing care">Nursing care</option>
          <option value="Independent living">Independent living</option>
        </select>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="">Apply for…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {patientName(p)}
            </option>
          ))}
        </select>
      </div>

      {activePatient ? (
        <p className="mb-4 text-sm text-ink-muted">
          Applying with <span className="font-medium text-ink">{patientName(activePatient)}</span>
          ’s profile.
        </p>
      ) : (
        <p className="mb-4 text-sm text-ink-muted">
          Select a patient to submit applications from this list.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <Card key={r.id} className="overflow-hidden p-0" hover>
            <div className="relative h-36">
              <Image src={r.image} alt={r.name} fill className="object-cover" sizes="400px" />
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {r.city}, {r.state} · {r.careLevels[0]}
                </p>
              </div>
              <p className="line-clamp-2 text-sm text-ink-secondary">{r.about}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-ink-faint">
                <p>
                  From{" "}
                  {r.priceFrom != null ? formatCurrency(r.priceFrom) : "Ask"}
                </p>
                <p>{r.availableNow ? "Availability listed" : "Ask about timing"}</p>
                <p>Distance · {r.distanceMiles} mi</p>
                <p>{r.acceptsMedicaid ? "Medicaid accepted" : "Private pay focus"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  href={`/find-senior-living/${r.id}`}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!activePatient}
                  onClick={() => {
                    if (!activePatient) return;
                    submitApplication(activePatient.id, r.id, r.name);
                  }}
                >
                  Apply
                </Button>
              </div>
              {activePatient?.applications.some((a) => a.communityId === r.id) ? (
                <p className="text-xs font-medium text-success">Already submitted for this patient</p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Prefer the full map view?{" "}
        <Link href="/find-senior-living" className="font-medium text-brand hover:underline">
          Open Find Senior Living
        </Link>
      </p>
    </div>
  );
}

export default function ProfessionalCommunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <CommunitiesInner />
    </Suspense>
  );
}
