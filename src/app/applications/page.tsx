"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  LayoutGrid,
  List,
  MessageSquare,
  Table2,
} from "lucide-react";
import {
  statusLabel,
  statusTone,
  type Application,
} from "@/data/applications";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useFamilyData } from "@/lib/family-data";
import { toDisplayApplication } from "@/lib/family-applications";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "cards" | "timeline";

function ApplicationsHub() {
  const params = useSearchParams();
  const { data } = useFamilyData();
  const rawView = params.get("view") || "cards";
  const [view, setView] = useState<ViewMode>(
    rawView === "table" || rawView === "timeline"
      ? rawView
      : "cards",
  );

  const apps = useMemo(() => {
    return data.applications
      .map(toDisplayApplication)
      .sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""));
  }, [data.applications]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Applications"
        description="Track every destination — status, documents, appointments, and next steps in one place."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Applications" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/family/apply-multi" variant="secondary">
              Multi-apply
            </Button>
            <Button href="/family/find-communities">Find communities</Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{apps.length}</span> application
          {apps.length === 1 ? "" : "s"}
        </p>
        <div className="flex rounded-xl border border-line bg-bg p-1">
          {(
            [
              { id: "table" as const, icon: Table2, label: "Table" },
              { id: "cards" as const, icon: LayoutGrid, label: "Cards" },
              { id: "timeline" as const, icon: List, label: "Timeline" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                view === id ? "bg-surface font-medium text-ink shadow-xs" : "text-ink-muted",
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-line px-6 py-16 text-center">
          <p className="text-xl font-semibold">No applications yet</p>
          <p className="mt-2 text-ink-muted">Start from a community or send to several at once.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button href="/family/apply-multi">Multi-apply</Button>
            <Button href="/family/find-communities" variant="secondary">
              Browse
            </Button>
          </div>
        </div>
      ) : view === "table" ? (
        <TableView apps={apps} />
      ) : view === "timeline" ? (
        <TimelineView apps={apps} />
      ) : (
        <CardsView apps={apps} />
      )}
    </div>
  );
}

function CardsView({ apps }: { apps: Application[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <Card key={app.id} className="overflow-hidden p-0" hover>
          <Link href={`/family/applications/${app.id}`} className="block">
            <div className="relative h-36 w-full">
              <Image src={app.image} alt="" fill className="object-cover" sizes="400px" />
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold leading-snug">{app.residenceName}</h2>
                <Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Sent {app.submittedDate || "—"} · Updated {app.lastUpdated}
              </p>
              <p className="mt-3 text-sm">
                <span className="text-ink-faint">Next · </span>
                {app.nextAction}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
                {app.missingDocuments.length > 0 && (
                  <span className="text-warn">{app.missingDocuments.length} docs missing</span>
                )}
                {app.unreadMessages > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={12} /> {app.unreadMessages}
                  </span>
                )}
                {app.upcomingAppointment && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> Visit
                  </span>
                )}
                {app.waitingPosition != null && <span>Waitlist #{app.waitingPosition}</span>}
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function TableView({ apps }: { apps: Application[] }) {
  return (
    <div className="overflow-x-auto rounded-[1.25rem] border border-line">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-bg text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-3 py-3 font-medium">Community</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Sent</th>
            <th className="px-3 py-3 font-medium">Updated</th>
            <th className="px-3 py-3 font-medium">Next action</th>
            <th className="px-3 py-3 font-medium">Docs</th>
            <th className="px-3 py-3 font-medium">Contact</th>
            <th className="px-3 py-3 font-medium">Appt / wait</th>
            <th className="px-3 py-3 font-medium">Msgs</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr key={app.id} className="border-t border-line hover:bg-bg-soft/60">
              <td className="px-3 py-3">
                <Link
                  href={`/family/applications/${app.id}`}
                  className="font-medium hover:text-brand"
                >
                  {app.residenceName}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </td>
              <td className="px-3 py-3 text-ink-muted">{app.submittedDate || "—"}</td>
              <td className="px-3 py-3 text-ink-muted">{app.lastUpdated}</td>
              <td className="max-w-[180px] px-3 py-3 text-ink-muted">{app.nextAction}</td>
              <td className="px-3 py-3">
                {app.missingDocuments.length ? (
                  <span className="text-warn">{app.missingDocuments.length} missing</span>
                ) : (
                  <span className="text-ink-faint">OK</span>
                )}
              </td>
              <td className="px-3 py-3 text-ink-muted">
                {app.contactName}
                <span className="block text-[11px] text-ink-faint">{app.contactRole}</span>
              </td>
              <td className="px-3 py-3 text-ink-muted">
                {app.upcomingAppointment ||
                  (app.waitingPosition != null ? `#${app.waitingPosition}` : "—")}
              </td>
              <td className="px-3 py-3">{app.unreadMessages || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineView({ apps }: { apps: Application[] }) {
  const events = useMemo(() => {
    const rows: {
      appId: string;
      name: string;
      image: string;
      label: string;
      date: string;
      status: string;
      detail?: string;
    }[] = [];
    apps.forEach((app) => {
      app.timeline
        .filter((t) => t.done)
        .forEach((t) => {
          rows.push({
            appId: app.id,
            name: app.residenceName,
            image: app.image,
            label: t.label,
            date: t.date,
            status: statusLabel(app.status),
            detail: t.detail,
          });
        });
    });
    return rows.reverse();
  }, [apps]);

  return (
    <div className="relative space-y-0 border-l border-line pl-6">
      {events.map((e, i) => (
        <div key={`${e.appId}-${e.label}-${i}`} className="relative pb-6">
          <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="flex flex-wrap items-start gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
              <Image src={e.image} alt="" fill className="object-cover" sizes="40px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-faint">{e.date}</p>
              <p className="font-medium">
                <Link href={`/family/applications/${e.appId}`} className="hover:text-brand">
                  {e.name}
                </Link>
                <span className="text-ink-muted"> · {e.label}</span>
              </p>
              {e.detail && <p className="text-sm text-ink-muted">{e.detail}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading applications…
        </div>
      }
    >
      <ApplicationsHub />
    </Suspense>
  );
}
