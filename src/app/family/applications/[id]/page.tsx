"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Download,
  FilePlus,
  GitCompare,
  MessageSquare,
  Reply,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  getApplication,
  statusLabel,
  statusTone,
  type Application,
  type TimelineEventType,
} from "@/data/applications";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useFamilyData } from "@/lib/family-data";
import { toDisplayApplication } from "@/lib/family-applications";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<TimelineEventType, string> = {
  created: "Creation",
  sent: "Sent",
  received: "Received",
  viewed: "Reviewed",
  request: "Request",
  document: "Document",
  message: "Message",
  appointment: "Appointment",
  status: "Status change",
  decision: "Decision",
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const {
    data,
    withdrawApplication,
    inviteFamilyToApplication,
    scheduleApplicationVisit,
  } = useFamilyData();

  const [inviteName, setInviteName] = useState("");
  const [tourWhen, setTourWhen] = useState("");
  const [flash, setFlash] = useState("");

  const familyApp = data.applications.find((a) => a.id === id);

  const app: Application | undefined = useMemo(() => {
    if (familyApp) return toDisplayApplication(familyApp);
    // Catalog-only records (getApplication) are illustration, not live submissions.
    return getApplication(id);
  }, [familyApp, id]);

  const otherIds = useMemo(() => {
    const ids = data.applications
      .map((a) => a.residenceId)
      .filter((rid) => rid !== app?.residenceId);
    return [...new Set(ids)].slice(0, 3);
  }, [data.applications, app?.residenceId]);

  if (!app) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-xl font-semibold">Application not found</p>
        <Button href="/family/applications" className="mt-4">
          Back to applications
        </Button>
      </div>
    );
  }

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2000);
  };

  const exportSummary = () => {
    const lines = [
      "Haven · Application summary",
      `Community: ${app.residenceName}`,
      `Status: ${statusLabel(app.status)}`,
      `Submitted: ${app.submittedDate || "—"}`,
      `Last update: ${app.lastUpdated}`,
      `Next action: ${app.nextAction}`,
      `Contact: ${app.contactName} (${app.contactRole})`,
      `Missing docs: ${app.missingDocuments.join(", ") || "None"}`,
      `Waitlist: ${app.waitingPosition ?? "—"}`,
      `Appointment: ${app.upcomingAppointment || "—"}`,
      "",
      "Timeline:",
      ...app.timeline.map((t) => `- ${t.date} · ${t.label}${t.detail ? ` — ${t.detail}` : ""}`),
      "",
      "Community responses on this application are private to this destination.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haven-application-${app.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showFlash("Summary downloaded");
  };

  const compareHref = `/family/compare?ids=${[app.residenceId, ...otherIds].slice(0, 4).join(",")}`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <Link
        href="/family/applications"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start gap-4 border-b border-line pb-5">
        <div className="relative h-20 w-28 overflow-hidden rounded-xl">
          <Image src={app.image} alt="" fill className="object-cover" sizes="112px" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{app.residenceName}</h1>
            <Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
            {familyApp?.batchId && <Badge tone="neutral">Multi-send</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Sent {app.submittedDate || "not yet"} · Last change {app.lastUpdated}
            {app.waitingPosition != null ? ` · Waitlist #${app.waitingPosition}` : ""}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-ink-faint">Next action · </span>
            {app.nextAction}
          </p>
        </div>
      </div>

      {flash && <p className="mt-3 text-sm text-success">{flash}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* Snapshot */}
          <Card className="grid gap-3 p-4 sm:grid-cols-2">
            <Snap label="Contact" value={`${app.contactName} · ${app.contactRole}`} />
            <Snap
              label="Appointment"
              value={app.upcomingAppointment || "None scheduled"}
            />
            <Snap
              label="Missing documents"
              value={app.missingDocuments.join(", ") || "None"}
            />
            <Snap
              label="Unread messages"
              value={String(app.unreadMessages)}
            />
            {familyApp && (
              <Snap
                label="Family access"
                value={familyApp.familyAccess.join(", ") || "Primary only"}
              />
            )}
            {familyApp?.communityDecision && (
              <div className="sm:col-span-2 rounded-xl border border-brand/20 bg-brand-soft/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                  Private community response
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {familyApp.communityDecision.note}
                </p>
                <p className="mt-1 text-[10px] text-ink-faint">
                  Not visible to other communities.
                </p>
              </div>
            )}
          </Card>

          {/* Full timeline */}
          <section>
            <h2 className="text-lg font-semibold">Timeline</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Creation, send, reception, reviews, requests, documents, messages, visits, and
              decisions.
            </p>
            <ol className="relative mt-4 space-y-0 border-l border-line pl-5">
              {app.timeline.map((ev) => (
                <li key={ev.id} className="relative pb-5">
                  <span
                    className={cn(
                      "absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full",
                      ev.done ? "bg-brand" : "bg-line",
                    )}
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    {TYPE_LABEL[ev.type]} · {ev.date}
                  </p>
                  <p className={cn("font-medium", !ev.done && "text-ink-faint")}>{ev.label}</p>
                  {ev.detail && (
                    <p className="text-sm text-ink-muted">{ev.detail}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Actions */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Actions
            </p>
            <Button
              href={`/family/documents?attach=${app.id}`}
              size="sm"
              variant="secondary"
              className="w-full justify-start"
            >
              <FilePlus size={14} /> Add a document
            </Button>
            <Button
              href={
                app.missingDocuments.length
                  ? `/family/documents?request=${encodeURIComponent(app.missingDocuments[0])}`
                  : "/family/documents"
              }
              size="sm"
              variant="secondary"
              className="w-full justify-start"
            >
              <Reply size={14} /> Respond to a request
            </Button>
            <Button
              href={`/family/messages?community=${app.residenceId}`}
              size="sm"
              variant="secondary"
              className="w-full justify-start"
            >
              <MessageSquare size={14} /> Send a message
            </Button>
            <Button
              href={compareHref}
              size="sm"
              variant="secondary"
              className="w-full justify-start"
            >
              <GitCompare size={14} /> Compare with others
            </Button>
            <Button
              type="button"
              size="sm"
              variant="soft"
              className="w-full justify-start"
              onClick={exportSummary}
            >
              <Download size={14} /> Download summary
            </Button>
            <Button
              href={`/find-senior-living/${app.residenceId}`}
              size="sm"
              variant="ghost"
              className="w-full justify-start"
            >
              View community
            </Button>
          </Card>

          {familyApp && (
            <>
              <Card className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Schedule a visit
                </p>
                <input
                  value={tourWhen}
                  onChange={(e) => setTourWhen(e.target.value)}
                  placeholder="e.g. Sat Jul 25 · 11:00 AM"
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!tourWhen.trim()}
                  onClick={() => {
                    scheduleApplicationVisit(familyApp.id, tourWhen);
                    setTourWhen("");
                    showFlash("Visit scheduled on this application");
                  }}
                >
                  <Calendar size={14} /> Schedule visit
                </Button>
              </Card>

              <Card className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Invite family
                </p>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Family member name"
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={!inviteName.trim()}
                  onClick={() => {
                    inviteFamilyToApplication(familyApp.id, inviteName);
                    setInviteName("");
                    showFlash("Family member invited");
                  }}
                >
                  <UserPlus size={14} /> Invite
                </Button>
              </Card>

              {familyApp.status !== "withdrawn" && familyApp.status !== "closed" && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Withdraw this application? The community will no longer review it.",
                      )
                    ) {
                      withdrawApplication(familyApp.id);
                      showFlash("Application withdrawn");
                      router.refresh();
                    }
                  }}
                >
                  <XCircle size={14} /> Withdraw application
                </Button>
              )}
            </>
          )}

          {!familyApp && app.status === "draft" && (
            <Button href={`/apply?residence=${app.residenceId}`} className="w-full">
              Continue draft
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
