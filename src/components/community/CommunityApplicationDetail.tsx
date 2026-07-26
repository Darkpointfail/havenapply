"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  MessageSquare,
  X,
} from "lucide-react";
import { AdmissionReviewGuide } from "@/components/community/AdmissionReviewGuide";
import { AdmissionTransitionGuide } from "@/components/community/AdmissionTransitionGuide";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  applicationCareType,
  applicationPriority,
  documentCategoryGroup,
  formatPortalDate,
  formatPortalTime,
  initialsFromName,
  isHistoryTerminalApplication,
  isTransitionApplication,
  priorityBadgeLabel,
  reviewChecklistProgress,
  reviewStatusLabel,
  transitionChecklistProgress,
  type AdmissionPriority,
  type CommunityApplication,
  type ReviewCheckId,
  type TransitionCheckId,
} from "@/lib/community-portal";
import { cn } from "@/lib/utils";

const DOC_ORDER = ["Identity", "Medical", "Financial", "Legal", "Other"] as const;

const DECLINE_REASONS = [
  "Clinical needs cannot be met",
  "No availability",
  "Financial requirements not met",
  "Other",
] as const;

function priorityTone(p: AdmissionPriority) {
  if (p === "high") return "danger" as const;
  if (p === "medium") return "warn" as const;
  return "success" as const;
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">{value?.trim() || ","}</p>
    </div>
  );
}

function SubCard({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-xs md:p-6"
    >
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-ink-faint">,</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-bg-soft px-3 py-1 text-xs font-medium text-ink-secondary"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CommunityApplicationDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const {
    ready,
    workspace,
    can,
    getApplication,
    acceptApplication,
    declineApplication,
    updateReviewChecklist,
    updateTransitionChecklist,
    setMoveInConfirmed,
    completeTransition,
  } = useCommunityPortal();

  const app = getApplication(id);
  const [auditOpen, setAuditOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [auditNote, setAuditNote] = useState("");
  const [declineReason, setDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [declineNote, setDeclineNote] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [moveInDraft, setMoveInDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const docsGrouped = useMemo(() => {
    if (!app) return {} as Record<string, CommunityApplication["documents"]>;
    return (app.documents || []).reduce<Record<string, CommunityApplication["documents"]>>(
      (acc, doc) => {
        const key = documentCategoryGroup(doc.category);
        (acc[key] ||= []).push(doc);
        return acc;
      },
      {},
    );
  }, [app]);

  const dossier = app?.dossier;
  const reviewProgress = app ? reviewChecklistProgress(app) : null;
  const transitionProgress = app ? transitionChecklistProgress(app) : null;
  const inTransition = app ? isTransitionApplication(app) : false;
  const isTerminal = app ? isHistoryTerminalApplication(app) : false;
  const inReview = Boolean(app && !inTransition && !isTerminal);

  const flashMsg = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  };

  const toggleCheck = (checkId: ReviewCheckId, value: boolean) => {
    if (!app) return;
    updateReviewChecklist(app.id, { [checkId]: value });
  };

  const toggleTransitionCheck = (checkId: TransitionCheckId, value: boolean) => {
    if (!app) return;
    updateTransitionChecklist(app.id, { [checkId]: value });
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
        <p className="mt-2 text-sm text-ink-muted">
          This dossier isn’t in your community workspace. Open Transition for accepted cases, or
          Admissions for the live review queue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/community/transition" size="sm">
            Transition
          </Button>
          <Button href="/community/dashboard" size="sm" variant="secondary">
            Admissions
          </Button>
        </div>
      </div>
    );
  }

  const priority = applicationPriority(app);
  const messageHref = `/community/messages?family=${encodeURIComponent(app.family.email)}&application=${encodeURIComponent(app.id)}&senior=${encodeURIComponent(app.seniorName)}&residence=${encodeURIComponent(app.residenceId)}`;

  const confirmApprove = () => {
    const r = acceptApplication(app.id, auditNote.trim() || undefined);
    if (r.ok) {
      setAuditOpen(false);
      flashMsg("Accepted — now in Transition for contracts & move-in");
      window.setTimeout(() => router.push("/community/transition"), 900);
    }
  };

  const confirmDecline = () => {
    const note = [declineReason, declineNote.trim()].filter(Boolean).join(" · ");
    const r = declineApplication(app.id, note);
    if (r.ok) {
      setDeclineOpen(false);
      flashMsg("Application declined");
    }
  };

  const confirmClose = () => {
    const r = completeTransition(app.id, closeNote.trim() || undefined);
    if (r.ok) {
      setCloseOpen(false);
      flashMsg("Dossier closed — moved to History");
      window.setTimeout(() => router.push("/community/applications?filter=history"), 900);
    }
  };

  const saveMoveInDate = () => {
    const date = moveInDraft.trim() || null;
    const r = setMoveInConfirmed(app.id, date);
    if (r.ok) {
      flashMsg(date ? "Move-in date confirmed" : "Move-in date cleared");
    }
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-10">
          <div>
            <Link
              href={inTransition ? "/community/transition" : "/community/dashboard"}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition hover:text-ink"
            >
              <ArrowLeft size={14} />
              {inTransition ? "Transition" : "Admissions queue"}
            </Link>

            <p className="mt-5 text-sm font-medium text-ink-muted">
              {inTransition
                ? "Move-in transition"
                : isTerminal
                  ? "Archived dossier"
                  : "Application review"}
            </p>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-strong">
                {initialsFromName(app.seniorName)}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.25rem]">
                  {app.seniorName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone(priority)}>{priorityBadgeLabel(priority)}</Badge>
                  <Badge tone="brand">{reviewStatusLabel(app)}</Badge>
                  {inReview && reviewProgress ? (
                    <Badge tone={reviewProgress.complete ? "success" : "warn"}>
                      Review {reviewProgress.done}/{reviewProgress.total}
                    </Badge>
                  ) : null}
                  {inTransition && transitionProgress ? (
                    <Badge tone={transitionProgress.complete ? "success" : "brand"}>
                      Transition {transitionProgress.done}/{transitionProgress.total}
                    </Badge>
                  ) : null}
                  {isTerminal ? (
                    <Badge tone={app.status === "closed" ? "success" : "danger"}>
                      {app.status === "closed" ? "Closed" : reviewStatusLabel(app)}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Submitted {formatPortalDate(app.submittedAt)}
                  <span className="mx-1.5">·</span>
                  Move-in{" "}
                  {app.moveInRequested
                    ? formatPortalDate(app.moveInRequested)
                    : "Flexible"}
                  <span className="mx-1.5">·</span>
                  {applicationCareType(app)}
                </p>
              </div>
            </div>

            {flash && (
              <p className="mt-4 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
                {flash}
              </p>
            )}
          </div>

          <div className="lg:hidden">
            {inTransition ? (
              <AdmissionTransitionGuide
                app={app}
                closed={false}
                onToggle={toggleTransitionCheck}
              />
            ) : inReview ? (
              <AdmissionReviewGuide app={app} decided={false} onToggle={toggleCheck} />
            ) : null}
          </div>

          <Section title="AI executive summary">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs md:p-6">
              <p className="text-[15px] leading-relaxed text-ink-secondary whitespace-pre-line">
                {app.executiveSummary || app.summary}
              </p>
            </div>
          </Section>

          <Section title="Client file">
            <p className="text-sm text-ink-muted">
              Complete dossier submitted with the application, identity, clinical history, medications,
              and prior placements.
            </p>
            <div className="mt-4 space-y-4">
              <SubCard id="section-identity" title="Identity & demographics">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Full name" value={app.seniorName} />
                  <Field label="Age" value={`${app.seniorAge} years`} />
                  <Field
                    label="Date of birth"
                    value={
                      dossier?.dateOfBirth
                        ? formatPortalDate(dossier.dateOfBirth)
                        : undefined
                    }
                  />
                  <Field label="Gender" value={dossier?.gender} />
                  <Field label="Primary language" value={dossier?.primaryLanguage} />
                  <Field label="Marital status" value={dossier?.maritalStatus} />
                  <Field label="Height" value={dossier?.height} />
                  <Field label="Weight" value={dossier?.weight} />
                  <Field label="Blood type" value={dossier?.bloodType} />
                  <Field label="Care type requested" value={applicationCareType(app)} />
                  <Field
                    label="Preferred move-in"
                    value={
                      app.moveInRequested
                        ? formatPortalDate(app.moveInRequested)
                        : "Flexible"
                    }
                  />
                  <Field label="Referral source" value={app.referralSource} />
                </div>
              </SubCard>

              <SubCard id="section-family" title="Living situation & contacts">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current address" value={dossier?.currentAddress} />
                  <Field
                    label="Current living situation"
                    value={dossier?.currentLivingSituation}
                  />
                  <Field
                    label="Primary contact"
                    value={`${app.family.name} · ${app.family.relationship}\n${app.family.email}${app.family.phone ? ` · ${app.family.phone}` : ""}`}
                  />
                  <Field
                    label="Emergency contact"
                    value={
                      app.emergencyContact
                        ? `${app.emergencyContact.name} · ${app.emergencyContact.relationship}\n${app.emergencyContact.phone}`
                        : undefined
                    }
                  />
                  <Field label="Social supports" value={dossier?.socialSupports} />
                  <Field label="Payment method" value={app.paymentMethod} />
                </div>
              </SubCard>

              <SubCard title="Insurance & clinical contacts">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Primary insurance" value={dossier?.insurancePrimary} />
                  <Field label="Secondary insurance" value={dossier?.insuranceSecondary} />
                  <Field label="Primary physician" value={dossier?.primaryPhysician} />
                  <Field label="Physician phone" value={dossier?.physicianPhone} />
                  <Field label="Pharmacy" value={dossier?.pharmacy} />
                  <Field label="Code status" value={dossier?.codeStatus} />
                  <Field
                    label="Advance directives"
                    value={dossier?.advanceDirectives}
                  />
                </div>
              </SubCard>

              <SubCard id="section-clinical" title="Pathologies & diagnoses">
                {dossier?.pathologies?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                          <th className="pb-2 pr-3 font-medium">Condition</th>
                          <th className="pb-2 pr-3 font-medium">Status</th>
                          <th className="pb-2 pr-3 font-medium">Since</th>
                          <th className="pb-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {dossier.pathologies.map((p) => (
                          <tr key={`${p.name}-${p.diagnosedYear}`}>
                            <td className="py-2.5 pr-3 font-medium text-ink">{p.name}</td>
                            <td className="py-2.5 pr-3 capitalize text-ink-secondary">
                              {p.status}
                            </td>
                            <td className="py-2.5 pr-3 text-ink-muted">
                              {p.diagnosedYear || ","}
                            </td>
                            <td className="py-2.5 text-ink-muted">{p.notes || ","}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ChipList items={app.medicalHighlights} />
                )}
              </SubCard>

              <SubCard id="section-medications" title="Medications">
                {dossier?.medications?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                          <th className="pb-2 pr-3 font-medium">Medication</th>
                          <th className="pb-2 pr-3 font-medium">Dose</th>
                          <th className="pb-2 pr-3 font-medium">Frequency</th>
                          <th className="pb-2 pr-3 font-medium">Route</th>
                          <th className="pb-2 font-medium">Indication</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {dossier.medications.map((m) => (
                          <tr key={`${m.name}-${m.dose}-${m.frequency}`}>
                            <td className="py-2.5 pr-3 font-medium text-ink">{m.name}</td>
                            <td className="py-2.5 pr-3 tabular-nums text-ink-secondary">
                              {m.dose}
                            </td>
                            <td className="py-2.5 pr-3 text-ink-muted">{m.frequency}</td>
                            <td className="py-2.5 pr-3 text-ink-muted">{m.route || ","}</td>
                            <td className="py-2.5 text-ink-muted">
                              {m.indication || ","}
                              {m.prescribedBy ? ` · ${m.prescribedBy}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-xs text-ink-faint">
                      {dossier.medications.length} medications on file
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-ink-faint">No medication list provided.</p>
                )}
              </SubCard>

              <SubCard title="Allergies">
                {dossier?.allergies?.length ? (
                  <ul className="space-y-2">
                    {dossier.allergies.map((a) => (
                      <li
                        key={a.substance}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-bg-soft px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-ink">{a.substance}</span>
                        <span className="text-ink-muted">
                          {a.reaction}
                          {a.severity ? ` · ${a.severity}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-faint">None reported</p>
                )}
              </SubCard>

              <SubCard title="Previous establishments & placements">
                {dossier?.previousFacilities?.length ? (
                  <ul className="space-y-3">
                    {dossier.previousFacilities.map((f) => (
                      <li
                        key={`${f.name}-${f.from}`}
                        className="rounded-xl border border-line bg-bg/50 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium text-ink">{f.name}</p>
                          <p className="text-xs text-ink-faint">
                            {[f.from, f.to].filter(Boolean).join(" → ") || "Dates n/a"}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">{f.type}</p>
                        {f.reasonForLeaving && (
                          <p className="mt-1.5 text-sm text-ink-secondary">
                            Reason for leaving: {f.reasonForLeaving}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-faint">No prior facilities listed.</p>
                )}
              </SubCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <SubCard title="Hospitalizations">
                  <ChipList items={dossier?.hospitalizations || []} />
                </SubCard>
                <SubCard title="Surgeries">
                  <ChipList items={dossier?.surgeries || []} />
                </SubCard>
              </div>

              <SubCard title="ADLs & functional status">
                {dossier?.adls?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                          <th className="pb-2 pr-3 font-medium">Activity</th>
                          <th className="pb-2 font-medium">Level of assist</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {dossier.adls.map((a) => (
                          <tr key={a.activity}>
                            <td className="py-2 pr-3 font-medium text-ink">{a.activity}</td>
                            <td className="py-2 text-ink-muted">{a.level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ChipList items={app.careNeeds} />
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Mobility aids"
                    value={dossier?.mobilityAids?.join(" · ")}
                  />
                  <Field label="Diet" value={dossier?.diet} />
                  <Field label="Continence" value={dossier?.continence} />
                  <Field label="Hearing / vision" value={dossier?.hearingVision} />
                  <Field label="Fall history" value={dossier?.fallHistory} />
                  <Field label="Smoking / alcohol" value={dossier?.smokingAlcohol} />
                </div>
              </SubCard>

              <SubCard title="Cognition & behaviors">
                <div className="grid gap-4 sm:grid-cols-1">
                  <Field label="Cognitive notes" value={dossier?.cognitiveNotes} />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Behaviors
                    </p>
                    <div className="mt-2">
                      <ChipList items={dossier?.behaviors || []} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Care needs
                    </p>
                    <div className="mt-2">
                      <ChipList items={app.careNeeds} />
                    </div>
                  </div>
                </div>
              </SubCard>

              <SubCard title="Vaccinations">
                <ChipList items={dossier?.vaccinations || []} />
              </SubCard>
            </div>
          </Section>

          <Section id="section-documents" title="Documents">
            <p className="text-sm text-ink-muted">
              Verified before submission. Organized for review, not for collection.
            </p>
            <div className="mt-4 space-y-6">
              {DOC_ORDER.map((cat) => {
                const docs = docsGrouped[cat];
                if (!docs?.length) return null;
                return (
                  <div key={cat}>
                    <h3 className="mb-3 text-sm font-semibold text-ink">{cat}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {docs.map((doc) => (
                        <article
                          key={doc.id}
                          className="rounded-2xl border border-line bg-surface p-4 shadow-xs"
                        >
                          <div className="flex h-28 items-center justify-center rounded-xl bg-bg-soft">
                            <FileText size={28} className="text-ink-faint" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-ink">{doc.name}</p>
                          {doc.aiSummary && (
                            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                              {doc.aiSummary}
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Button type="button" size="sm" variant="secondary" disabled>
                              Preview
                            </Button>
                            <Button type="button" size="sm" variant="ghost" disabled>
                              <Download size={14} />
                              Download
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Messages">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <p className="text-sm text-ink-muted">
                Talk with the family inside HavenApply. The conversation stays linked to this
                application.
              </p>
              <Button href={messageHref} className="mt-4" size="sm">
                <MessageSquare size={14} />
                Open conversation
              </Button>
            </div>
          </Section>

          <Section title="Timeline">
            <ol className="space-y-0">
              {app.auditLog
                .slice()
                .reverse()
                .map((entry, i, arr) => (
                  <li key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                      {i < arr.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-line" />
                      )}
                    </div>
                    <div className="min-w-0 pb-5">
                      <p className="text-sm font-medium text-ink">{entry.action}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {entry.actor} · {formatPortalTime(entry.at)}
                      </p>
                    </div>
                  </li>
                ))}
            </ol>
          </Section>

          <Section
            id="section-decision"
            title={inTransition ? "Transition & close" : isTerminal ? "Outcome" : "Decision"}
          >
            <p className="text-sm text-ink-muted">
              {inTransition
                ? "Complete contracts, payment, and family logistics, then close the dossier."
                : isTerminal
                  ? "This dossier is archived."
                  : "Finish the guided checklist, then choose one clear outcome."}
            </p>
            <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-xs md:p-6">
              {isTerminal ? (
                <p className="rounded-xl bg-bg-soft px-3 py-3 text-sm text-ink-secondary">
                  {app.status === "closed"
                    ? "Move-in transition complete — dossier closed."
                    : `This application is ${app.status.replaceAll("_", " ")}.`}
                </p>
              ) : inTransition ? (
                <>
                  {!transitionProgress?.complete ? (
                    <p className="mb-4 rounded-xl bg-brand-soft/50 px-3 py-2.5 text-sm text-ink-secondary">
                      Transition in progress ({transitionProgress?.done}/{transitionProgress?.total}
                      ). Finish the residency agreement, deposit, family details, and move-in date.
                    </p>
                  ) : (
                    <p className="mb-4 rounded-xl bg-success-soft/60 px-3 py-2.5 text-sm text-success">
                      All transition steps complete — ready to close the dossier.
                    </p>
                  )}

                  <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                        Confirmed move-in date
                      </label>
                      <input
                        type="date"
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
                        value={moveInDraft || app.moveInConfirmed || ""}
                        onChange={(e) => setMoveInDraft(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!can("acceptDecline")}
                        onClick={saveMoveInDate}
                      >
                        Save date
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      disabled={!can("acceptDecline") || !transitionProgress?.complete}
                      onClick={() => {
                        setCloseNote("");
                        setCloseOpen(true);
                      }}
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-success/40 hover:bg-success-soft/40 disabled:opacity-50"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                        <Check size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">
                          Close dossier
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          {transitionProgress?.complete
                            ? "Move-in ready · archive"
                            : "Complete transition first"}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(messageHref)}
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-warn/40 hover:bg-warn-soft/30"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-warn-soft text-warn">
                        <MessageSquare size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">
                          Message family
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          Contracts, payment, logistics
                        </span>
                      </span>
                    </button>

                    <Link
                      href="/community/transition"
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-brand/40 hover:bg-brand-soft/30"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <FileText size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">
                          Transition board
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          All accepted dossiers
                        </span>
                      </span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {!reviewProgress?.complete ? (
                    <p className="mb-4 rounded-xl bg-warn-soft/50 px-3 py-2.5 text-sm text-ink-secondary">
                      Review still in progress ({reviewProgress?.done}/{reviewProgress?.total}).
                      Check identity, clinical file, medications, documents, family contacts, and
                      program fit before approving.
                    </p>
                  ) : (
                    <p className="mb-4 rounded-xl bg-success-soft/60 px-3 py-2.5 text-sm text-success">
                      All review checks complete — ready to finalize.
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      disabled={!can("acceptDecline") || !reviewProgress?.complete}
                      onClick={() => {
                        setAuditNote("");
                        setAuditOpen(true);
                      }}
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-success/40 hover:bg-success-soft/40 disabled:opacity-50"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                        <Check size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">Approve</span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          {reviewProgress?.complete
                            ? "Then open Transition"
                            : "Complete checklist first"}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!can("requestInfo")}
                      onClick={() => router.push(messageHref)}
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-warn/40 hover:bg-warn-soft/30 disabled:opacity-50"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-warn-soft text-warn">
                        <MessageSquare size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">
                          Request information
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          Message the family
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!can("acceptDecline")}
                      onClick={() => {
                        setDeclineReason(DECLINE_REASONS[0]);
                        setDeclineNote("");
                        setDeclineOpen(true);
                      }}
                      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-danger/40 hover:bg-danger-soft/25 disabled:opacity-50"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-danger">
                        <X size={18} />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-ink">Decline</span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          Select a reason
                        </span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </Section>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            {inTransition ? (
              <AdmissionTransitionGuide
                app={app}
                closed={false}
                onToggle={toggleTransitionCheck}
              />
            ) : inReview ? (
              <AdmissionReviewGuide app={app} decided={false} onToggle={toggleCheck} />
            ) : null}
          </div>
        </div>
      </div>

      {/* Admission Audit modal */}
      {auditOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setAuditOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <h2 className="text-xl font-semibold tracking-tight">Confirm approval</h2>
            <p className="mt-1 text-sm text-ink-muted">
              You completed the guided review. After accept, this dossier moves to Transition for
              contracts, payment, and move-in details.
            </p>
            <ul className="mt-5 space-y-2">
              {(["identity", "clinical", "medications", "documents", "family", "fit"] as const).map(
                (id) => {
                  const labels: Record<string, string> = {
                    identity: "Identity & demographics",
                    clinical: "Clinical file",
                    medications: "Medications & allergies",
                    documents: "Documents packet",
                    family: "Family & contacts",
                    fit: "Program fit",
                  };
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-xl bg-success-soft/50 px-3 py-2.5 text-sm text-ink"
                    >
                      <Check size={14} className="text-success" />
                      {labels[id]}
                    </li>
                  );
                },
              )}
            </ul>
            <label className="mt-4 block text-sm">
              Internal notes (optional)
              <textarea
                rows={3}
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder="Notes for your team…"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setAuditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!reviewProgress?.complete}
                onClick={confirmApprove}
              >
                Approve admission
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setDeclineOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <h2 className="text-xl font-semibold tracking-tight">Decline application</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Choose a reason. The family receives a clear update in HavenApply.
            </p>
            <div className="mt-5 space-y-2">
              {DECLINE_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition",
                    declineReason === reason
                      ? "border-brand bg-brand-soft/40"
                      : "border-line bg-bg",
                  )}
                >
                  <input
                    type="radio"
                    name="decline-reason"
                    checked={declineReason === reason}
                    onChange={() => setDeclineReason(reason)}
                    className="text-brand"
                  />
                  {reason}
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              Internal note (optional)
              <textarea
                rows={3}
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeclineOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="danger" className="flex-1" onClick={confirmDecline}>
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close transition modal */}
      {closeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setCloseOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <h2 className="text-xl font-semibold tracking-tight">Close dossier</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Confirm that contracts, payment, and move-in details are complete. The dossier moves
              to History.
            </p>
            <ul className="mt-5 space-y-2">
              {(
                [
                  ["contract", "Residency agreement"],
                  ["payment", "Deposit & payment"],
                  ["familyDetails", "Final family details"],
                  ["moveInDate", "Move-in date"],
                ] as const
              ).map(([id, label]) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-xl bg-success-soft/50 px-3 py-2.5 text-sm text-ink"
                >
                  <Check size={14} className="text-success" />
                  {label}
                </li>
              ))}
            </ul>
            <label className="mt-4 block text-sm">
              Closing note (optional)
              <textarea
                rows={3}
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder="e.g. Move-in May 12 · deposit received"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setCloseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!transitionProgress?.complete}
                onClick={confirmClose}
              >
                Close dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
