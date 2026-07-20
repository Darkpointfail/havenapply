"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  MessageSquare,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { applications } from "@/data/applications";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import { useAi } from "@/lib/ai";

function DashboardInner() {
  const { user } = useAuth();
  const { data, completeness } = useFamilyData();
  const { ask } = useAi();

  const actionItems = [
    {
      title: "Upload doctor’s letter",
      meta: "Requested by Lakeside Haven",
      tone: "warn" as const,
      href: "/documents",
    },
    {
      title: "Confirm tour · Maple Grove",
      meta: "Tue · 2:00 PM",
      tone: "accent" as const,
      href: "/calendar",
    },
    {
      title: "Review AI medication extract",
      meta: "2 fields need verification",
      tone: "ai" as const,
      href: "/profile",
    },
  ];

  const active = applications.filter((a) =>
    [
      "submitted",
      "received",
      "more_info",
      "under_review",
      "waitlisted",
      "tour_requested",
      "assessment_requested",
      "approved",
      "offer_received",
      "conditionally_approved",
    ].includes(a.status),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Good to see you, {user?.name?.split(" ")[0]}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Your admissions home
          </h1>
          <p className="mt-2 text-ink-muted">
            {data.person.name || "Loved one"} · profile {completeness}% ·{" "}
            {active.length} active applications
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/residences" variant="secondary">
            Find communities
          </Button>
          <Button href="/apply">
            Apply <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Needs attention today</h2>
            <Badge tone="warn">{actionItems.length}</Badge>
          </div>
          <ul className="mt-4 space-y-2">
            {actionItems.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg-soft/60 px-4 py-3 transition hover:bg-bg-soft"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-ink-muted">{item.meta}</p>
                  </div>
                  <Badge tone={item.tone}>Action</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-ai-soft via-surface to-brand-soft p-5 md:p-6">
            <div className="flex items-center gap-2 text-ai">
              <Sparkles size={18} />
              <p className="text-sm font-semibold">Haven AI</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Based on wait times and care fit, prioritize Maple Grove (accepted) and keep Cedar Memory
              Care warm — position #4.
            </p>
            <Button
              size="sm"
              variant="ai"
              className="mt-4"
              onClick={() => ask("What should I do next for Margaret’s admissions?")}
            >
              Ask what to do next
            </Button>
          </div>
          <div className="space-y-3 border-t border-line p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Profile completeness</span>
              <span className="font-semibold text-brand">{completeness}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <Button href="/profile" size="sm" variant="soft" className="w-full">
              Continue medical profile
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active applications</h2>
            <Button href="/applications" size="sm" variant="ghost">
              View all
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {active.slice(0, 4).map((app) => (
              <Link
                key={app.id}
                href="/applications"
                className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:bg-bg-soft"
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                  <Image src={app.image} alt="" fill className="object-cover" sizes="48px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{app.residenceName}</p>
                  <p className="text-xs text-ink-muted">
                    {app.submittedDate ? `Submitted ${app.submittedDate}` : "Draft"}
                    {app.waitingPosition != null ? ` · Wait #${app.waitingPosition}` : ""}
                  </p>
                </div>
                {app.requestedDocuments.length > 0 && (
                  <Badge tone="warn">
                    <FileWarning size={12} /> Docs
                  </Badge>
                )}
                {(app.status === "approved" || app.status === "offer_received") && (
                  <Badge tone="success">Approved</Badge>
                )}
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Upcoming</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <CalendarDays size={16} className="mt-0.5 text-brand" />
                <div>
                  <p className="font-medium">Tour · Maple Grove</p>
                  <p className="text-ink-muted">Tue 2:00 PM</p>
                </div>
              </li>
              <li className="flex gap-3">
                <MessageSquare size={16} className="mt-0.5 text-accent" />
                <div>
                  <p className="font-medium">2 unread messages</p>
                  <p className="text-ink-muted">Lakeside Haven</p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin size={16} className="mt-0.5 text-success" />
                <div>
                  <p className="font-medium">Target move-in</p>
                  <p className="text-ink-muted">Aug 1, 2026</p>
                </div>
              </li>
            </ul>
            <Button href="/calendar" size="sm" variant="secondary" className="mt-4 w-full">
              Open calendar
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-3 grid gap-2">
              <Button href="/documents" size="sm" variant="soft">
                Upload document
              </Button>
              <Button href="/compare?ids=maple-grove,cedar-memory" size="sm" variant="secondary">
                Compare shortlist
              </Button>
              <Button href="/tasks" size="sm" variant="ghost">
                <CheckCircle2 size={14} /> Task checklist
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth role="family">
      <DashboardInner />
    </RequireAuth>
  );
}
