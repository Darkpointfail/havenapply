"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";

const events = [
  { day: "Tue", date: "21", title: "Tour · Maple Grove", time: "2:00 PM", type: "Tour" },
  { day: "Thu", date: "23", title: "Docs due · Lakeside", time: "End of day", type: "Deadline" },
  { day: "Mon", date: "27", title: "Assessment call", time: "10:30 AM", type: "Assessment" },
  { day: "Fri", date: "1", title: "Target move-in", time: "Aug", type: "Move-in" },
];

function CalendarInner() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admissions calendar</h1>
      <p className="mt-2 text-ink-muted">Tours, assessments, deadlines, and move-in — one timeline.</p>

      <div className="mt-8 space-y-3">
        {events.map((e) => (
          <Card key={e.title} className="flex items-center gap-4 p-4" hover>
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-bg-soft">
              <span className="text-[10px] font-semibold uppercase text-ink-faint">{e.day}</span>
              <span className="text-lg font-semibold">{e.date}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{e.title}</p>
              <p className="text-sm text-ink-muted">{e.time}</p>
            </div>
            <Badge tone={e.type === "Deadline" ? "warn" : e.type === "Move-in" ? "success" : "brand"}>
              {e.type}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <RequireAuth role="family">
      <CalendarInner />
    </RequireAuth>
  );
}
