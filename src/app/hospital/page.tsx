"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useT } from "@/lib/i18n/locale";

function HospitalInner() {
  const t = useT();
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="accent">Hospital portal</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Discharge → placement</h1>
          <p className="mt-2 text-ink-muted">
            {t("Create patient, upload packet, multi-send to communities, track admissions.")}
          </p>
        </div>
        <Button>New patient packet</Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Active referrals", "14"],
          ["Awaiting community", "6"],
          ["Placed this week", "3"],
        ].map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-3xl font-semibold">{v}</p>
            <p className="text-sm text-ink-muted">{l}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold">Open referrals</div>
        {[
          ["Paul Gilbert", "Memory care", "Sent to 4", "2 reviewing"],
          ["Robert Lang", "Rehab", "Sent to 2", "Docs requested"],
          ["Helen Park", "Assisted living", "Draft", "Needs insurance card"],
        ].map((row) => (
          <div
            key={row[0]}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-0"
          >
            <div>
              <p className="font-medium">{row[0]}</p>
              <p className="text-sm text-ink-muted">
                {row[1]} · {row[2]}
              </p>
            </div>
            <Badge tone="brand">{row[3]}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function HospitalPage() {

  const t = useT();  return (
    <RequireAuth role="professional">
      <HospitalInner />
    </RequireAuth>
  );
}
