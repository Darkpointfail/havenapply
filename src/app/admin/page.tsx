"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ClipboardList,
  DoorOpen,
  LogOut,
  Search,
  Users,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { applications } from "@/data/applications";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const inbox = applications.filter((a) =>
  ["submitted", "received", "more_info", "under_review", "waitlisted", "tour_requested"].includes(
    a.status,
  ),
);

const careLevels = [
  { label: "Assisted living", count: 42 },
  { label: "Memory care", count: 18 },
  { label: "Nursing care", count: 11 },
  { label: "Rehabilitation", count: 7 },
];

const rooms = [
  { name: "Garden suite 12", status: "Available", type: "Private" },
  { name: "Memory wing 4B", status: "Reserved", type: "Private" },
  { name: "Courtyard 8", status: "Available", type: "Shared" },
  { name: "Lake view 3", status: "Maintenance", type: "Private" },
];

const visits = [
  { family: "Chen family", time: "Today · 2:00 PM", suite: "Garden suite" },
  { family: "Patel family", time: "Tomorrow · 10:30 AM", suite: "Memory wing" },
  { family: "Rossi family", time: "Thu · 3:15 PM", suite: "Courtyard" },
];

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = inbox.filter((a) => {
    if (filter === "All") return true;
    if (filter === "Documents needed") return a.status === "more_info";
    if (filter === "Under review") return a.status === "under_review";
    if (filter === "Waiting list") return a.status === "waitlisted";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky">
            Residence portal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {user?.organization ?? "Residence"} · Intake
          </h1>
          <p className="mt-2 text-ink-muted">
            Signed in as {user?.name} · Incoming applications, rooms, and visits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="sky">Staff only</Badge>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              signOut();
              router.push("/residence-login");
            }}
          >
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Incoming applications", value: "12", icon: ClipboardList, tone: "text-teal" },
          { label: "On waiting list", value: "27", icon: Users, tone: "text-sky" },
          { label: "Available rooms", value: "5", icon: DoorOpen, tone: "text-sage" },
          { label: "Visits this week", value: "8", icon: CalendarDays, tone: "text-amber" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5" hover>
            <kpi.icon className={kpi.tone} size={22} />
            <p className="mt-4 text-3xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="text-sm text-ink-muted">{kpi.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Applicant inbox</h2>
            <div className="flex flex-wrap gap-2">
              {["All", "Documents needed", "Under review", "Waiting list"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    filter === f ? "bg-teal text-white" : "bg-bg text-ink-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-bg px-3 py-2.5">
            <Search size={16} className="text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search applicants…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="mt-4 space-y-3">
            {filtered.map((app, i) => {
              const score = [92, 84, 76, 88, 71][i % 5];
              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-border bg-bg/60 p-4 transition hover:bg-bg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                        <Image src={app.image} alt="" fill className="object-cover" sizes="48px" />
                      </div>
                      <div>
                        <p className="font-semibold">Margaret Chen</p>
                        <p className="text-sm text-ink-muted">
                          Applied {app.submittedDate ?? "—"} · via Haven profile
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone="teal">Assisted living</Badge>
                          {app.status === "more_info" && <Badge tone="amber">Docs requested</Badge>}
                          {app.waitingPosition != null && (
                            <Badge tone="sky">Wait #{app.waitingPosition}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-sm font-medium text-teal-deep">
                        <Sparkles size={14} />
                        {score}% match
                      </div>
                      <p className="mt-1 text-xs text-ink-subtle">Medical compatibility</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="soft">
                      <Check size={14} /> Accept
                    </Button>
                    <Button size="sm" variant="secondary">
                      <MessageSquare size={14} /> Request info
                    </Button>
                    <Button size="sm" variant="secondary">
                      <CalendarDays size={14} /> Schedule visit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-coral hover:bg-coral-soft">
                      <X size={14} /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Residents by care level</h2>
            <ul className="mt-4 space-y-3">
              {careLevels.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal to-sky"
                      style={{ width: `${Math.min(100, c.count * 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold">Available rooms</h2>
            <ul className="mt-4 space-y-3">
              {rooms.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-ink-muted">{r.type}</p>
                  </div>
                  <Badge
                    tone={
                      r.status === "Available" ? "sage" : r.status === "Reserved" ? "amber" : "neutral"
                    }
                  >
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold">Visit calendar</h2>
            <ul className="mt-4 space-y-3">
              {visits.map((v) => (
                <li key={v.family} className="rounded-xl border border-border px-3 py-3 text-sm">
                  <p className="font-medium">{v.family}</p>
                  <p className="text-ink-muted">
                    {v.time} · {v.suite}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
