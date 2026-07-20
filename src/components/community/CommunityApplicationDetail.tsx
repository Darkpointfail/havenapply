"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { STATUS_META } from "@/data/applications";
import type { ApplicationStatus } from "@/data/applications";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { formatPortalTime, statusLabel, statusTone } from "@/lib/community-portal";

export function CommunityApplicationDetail() {
  const params = useParams();
  const id = String(params.id || "");
  const {
    ready,
    workspace,
    can,
    getApplication,
    assignApplication,
    addInternalNote,
    requestInfo,
    requestDocument,
    proposeTour,
    proposeAssessment,
    changeStatus,
    acceptApplication,
    declineApplication,
  } = useCommunityPortal();

  const app = getApplication(id);
  const [note, setNote] = useState("");
  const [info, setInfo] = useState("");
  const [doc, setDoc] = useState("");
  const [tour, setTour] = useState("");
  const [assessment, setAssessment] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const flashMsg = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2000);
  };

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-lg font-semibold">Application not found</p>
        <Button href="/community/applications" className="mt-4" size="sm">
          Back to list
        </Button>
      </div>
    );
  }

  const actionableStatuses = STATUS_META.filter((s) =>
    [
      "received",
      "under_review",
      "more_info",
      "assessment_requested",
      "tour_requested",
      "waitlisted",
      "conditionally_approved",
      "approved",
      "declined",
      "offer_received",
    ].includes(s.id),
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={app.seniorName}
        description={`${app.seniorAge} · ${app.relationship} · submitted ${formatPortalTime(app.submittedAt)}`}
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Applications", href: "/community/applications" },
          { label: app.seniorName },
        ]}
        actions={<Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>}
      />

      {flash && (
        <Card className="mb-4 border-success/30 bg-success-soft/40 p-3 text-sm text-success">
          {flash}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Senior summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">{app.summary}</p>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Care needs</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
              {app.careNeeds.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-ink-muted">Medical highlights</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {app.medicalHighlights.map((m) => (
                <Badge key={m} tone="warn">
                  {m}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Authorized documents</h2>
            <ul className="mt-3 divide-y divide-line">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {d.name}{" "}
                    <span className="text-ink-faint">· {d.category}</span>
                  </span>
                  {d.shared ? (
                    <Badge tone="success">Shared</Badge>
                  ) : (
                    <Badge tone="neutral">
                      <Lock size={10} /> Not shared
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Family contact</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Name</dt>
                <dd className="font-medium">{app.family.name}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Relationship</dt>
                <dd className="font-medium">{app.family.relationship}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd className="font-medium">{app.family.email}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd className="font-medium">{app.family.phone}</dd>
              </div>
            </dl>
            <Button
              href={`/community/messages?family=${encodeURIComponent(app.family.email)}&application=${encodeURIComponent(app.id)}&senior=${encodeURIComponent(app.seniorName)}&residence=${encodeURIComponent(app.residenceId)}`}
              size="sm"
              variant="secondary"
              className="mt-4"
            >
              Message family
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Internal notes</h2>
            {can("addInternalNotes") && (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                  placeholder="Visible only to your team"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const res = addInternalNote(app.id, note);
                    if (res.ok) {
                      setNote("");
                      flashMsg("Note saved");
                    } else alert(res.error);
                  }}
                >
                  Add
                </Button>
              </div>
            )}
            <ul className="mt-4 space-y-3">
              {app.internalNotes.map((n) => (
                <li key={n.id} className="rounded-xl bg-bg-soft p-3 text-sm">
                  <p className="font-medium">{n.author}</p>
                  <p className="mt-1">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-faint">{formatPortalTime(n.at)}</p>
                </li>
              ))}
              {app.internalNotes.length === 0 && (
                <p className="text-sm text-ink-muted">No internal notes yet.</p>
              )}
            </ul>
          </Card>

          {can("viewAudit") && (
            <Card className="p-5">
              <h2 className="font-semibold">Action history</h2>
              <ul className="mt-3 space-y-2">
                {[...app.auditLog].reverse().map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="font-medium">{e.actor}</span> — {e.action}
                    <span className="ml-2 text-xs text-ink-faint">
                      {formatPortalTime(e.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Assign</h2>
            {can("assignApplications") ? (
              <select
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={app.assigneeId || ""}
                onChange={(e) => {
                  const res = assignApplication(app.id, e.target.value || null);
                  if (res.ok) flashMsg("Assignment updated");
                  else alert(res.error);
                }}
              >
                <option value="">Unassigned</option>
                {workspace.team
                  .filter((t) => t.status === "active")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.jobTitle}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="text-sm text-ink-muted">{app.assigneeName || "Unassigned"}</p>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Status</h2>
            {can("changeStatus") ? (
              <select
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={app.status}
                onChange={(e) => {
                  const res = changeStatus(app.id, e.target.value as ApplicationStatus);
                  if (res.ok) flashMsg("Status updated");
                  else alert(res.error);
                }}
              >
                {actionableStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
            )}
          </Card>

          {can("requestInfo") && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Request information</h2>
              <textarea
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                rows={2}
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="What do you need from the family?"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const res = requestInfo(app.id, info);
                  if (res.ok) {
                    setInfo("");
                    flashMsg("Information requested");
                  } else alert(res.error);
                }}
              >
                Send request
              </Button>
              {app.infoRequest && (
                <p className="text-xs text-ink-muted">Current: {app.infoRequest}</p>
              )}
            </Card>
          )}

          {can("requestDocuments") && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Request document</h2>
              <input
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder="e.g. Doctor’s letter"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const res = requestDocument(app.id, doc);
                  if (res.ok) {
                    setDoc("");
                    flashMsg("Document requested");
                  } else alert(res.error);
                }}
              >
                Request
              </Button>
              {app.documentRequest && (
                <p className="text-xs text-ink-muted">Current: {app.documentRequest}</p>
              )}
            </Card>
          )}

          {can("proposeTour") && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Propose visit</h2>
              <input
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={tour}
                onChange={(e) => setTour(e.target.value)}
                placeholder="Thu Apr 23 · 2:00 PM"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const res = proposeTour(app.id, tour);
                  if (res.ok) {
                    setTour("");
                    flashMsg("Visit proposed");
                  } else alert(res.error);
                }}
              >
                Propose
              </Button>
              {app.tourProposal && (
                <p className="text-xs text-ink-muted">Current: {app.tourProposal}</p>
              )}
            </Card>
          )}

          {can("proposeAssessment") && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Propose assessment</h2>
              <input
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Mon Apr 27 · 10:30 AM"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const res = proposeAssessment(app.id, assessment);
                  if (res.ok) {
                    setAssessment("");
                    flashMsg("Assessment proposed");
                  } else alert(res.error);
                }}
              >
                Propose
              </Button>
              {app.assessmentProposal && (
                <p className="text-xs text-ink-muted">Current: {app.assessmentProposal}</p>
              )}
            </Card>
          )}

          {can("acceptDecline") && (
            <Card className="flex gap-2 p-5">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  const res = acceptApplication(app.id);
                  if (res.ok) flashMsg("Application accepted");
                  else alert(res.error);
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                onClick={() => {
                  if (!confirm("Decline this application?")) return;
                  const res = declineApplication(app.id);
                  if (res.ok) flashMsg("Application declined");
                  else alert(res.error);
                }}
              >
                Decline
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
