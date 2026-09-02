"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  FileText,
  MessageSquare,
  X,
} from "lucide-react";
import { AdmissionTransitionGuide } from "@/components/community/AdmissionTransitionGuide";
import {
  AiSummaryBanner,
  DossierTabs,
  ReviewChecklistRail,
  SECTION_TAB_MAP,
  type DossierTabId,
} from "@/components/community/ApplicationReviewLayout";
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
import { useT } from "@/lib/i18n/locale";
import { catalogLabel } from "@/lib/i18n/catalog-labels";
import { ProfileAvatar } from "@/components/ProfilePhotoPicker";

const DOC_ORDER = ["Identity", "Medical", "Financial", "Legal", "Other"] as const;

const DECLINE_REASONS = [
  "Clinical needs cannot be met",
  "No availability",
  "Financial requirements not met",
  "Other",
] as const;

function buildAcceptEmailDraft(input: {
  seniorName: string;
  familyName: string;
  communityName: string;
}) {
  const subject = `Good news — ${input.seniorName}'s application was accepted at ${input.communityName}`;
  const body = `Dear ${input.familyName},

We're pleased to let you know that ${input.seniorName}'s application to ${input.communityName} has been accepted.

Our admissions team will follow up shortly about next steps, including contracts and move-in planning. You can also follow the update in HavenApply.

Warm regards,
${input.communityName} Admissions`;
  return { subject, body };
}

function buildAcceptSmsDraft(input: {
  seniorName: string;
  communityName: string;
}) {
  return `${input.communityName}: ${input.seniorName}'s application was accepted. Check HavenApply for next steps, or reply to this message.`;
}

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
      <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
        {title}
      </h2>
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
      className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 md:p-6"
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
  const t = useT();
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
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [declineReason, setDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [declineNote, setDeclineNote] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [moveInDraft, setMoveInDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DossierTabId>("snapshot");

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

  const openChecklistSection = (sectionId: string) => {
    setActiveTab(SECTION_TAB_MAP[sectionId] ?? "snapshot");
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
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
          {t("This dossier isn’t in your community workspace. Open Transition for accepted cases, or")}
          {t("Admissions for the live review queue.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/community/transition" size="sm">
            {t("Transition")}
          </Button>
          <Button href="/community/dashboard" size="sm" variant="secondary">
            Admissions
          </Button>
        </div>
      </div>
    );
  }

  const priority = applicationPriority(app);
  const communityName =
    workspace.profile?.name || workspace.residenceName || "our community";
  const messageHref = `/community/messages?family=${encodeURIComponent(app.family.email)}&application=${encodeURIComponent(app.id)}&senior=${encodeURIComponent(app.seniorName)}&residence=${encodeURIComponent(app.residenceId)}`;
  const appRecord = app as unknown as Record<string, unknown>;
  const aiHighlights = Array.isArray(appRecord.aiHighlights)
    ? (appRecord.aiHighlights as string[]).filter(Boolean)
    : undefined;
  const aiFlags = Array.isArray(appRecord.aiFlags)
    ? (appRecord.aiFlags as string[]).filter(Boolean)
    : undefined;

  const openAcceptModal = () => {
    const emailDraft = buildAcceptEmailDraft({
      seniorName: app.seniorName,
      familyName: app.family.name || "Family",
      communityName,
    });
    setAuditNote("");
    setSendEmail(true);
    setSendSms(Boolean(app.family.phone?.trim()));
    setEmailTo(app.family.email || "");
    setEmailSubject(emailDraft.subject);
    setEmailBody(emailDraft.body);
    setSmsTo(app.family.phone || "");
    setSmsBody(
      buildAcceptSmsDraft({
        seniorName: app.seniorName,
        communityName,
      }),
    );
    setAuditOpen(true);
  };

  const confirmApprove = () => {
    const emailPayload =
      sendEmail && emailTo.trim() && emailBody.trim()
        ? {
            to: emailTo.trim(),
            subject: emailSubject.trim() || "Application accepted",
            body: emailBody.trim(),
          }
        : null;
    const smsPayload =
      sendSms && smsTo.trim() && smsBody.trim()
        ? {
            to: smsTo.trim(),
            body: smsBody.trim(),
          }
        : null;

    if (sendEmail && !emailPayload) {
      flashMsg("Add an email address and message, or turn email off.");
      return;
    }
    if (sendSms && !smsPayload) {
      flashMsg("Add a phone number and text message, or turn SMS off.");
      return;
    }

    const r = acceptApplication(app.id, {
      note: auditNote.trim() || undefined,
      email: emailPayload,
      sms: smsPayload,
    });
    if (r.ok) {
      setAuditOpen(false);
      const parts = ["Accepted, now in Transition"];
      if (emailPayload) parts.push("email sent");
      if (smsPayload) parts.push("text sent");
      flashMsg(parts.join(" · "));
      window.setTimeout(() => router.push(`/community/transition/${app.id}`), 900);
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
      flashMsg("Dossier closed, moved to History");
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

  const familyContactAside = (
    <>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
          {t("Family contact")}
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
            {initialsFromName(app.family.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{app.family.name}</p>
            <p className="text-sm text-ink-muted">{catalogLabel(t, app.family.relationship)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            size="sm"
            onClick={() => router.push(messageHref)}
          >
            {t("Message family")}
          </Button>
          <a
            href={`mailto:${app.family.email}`}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink shadow-xs transition hover:border-line-strong hover:bg-bg-soft"
          >
            {t("Email")}
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
          {t("Activity")}
        </h2>
        <ol className="mt-4 space-y-0">
          {app.auditLog
            .slice()
            .reverse()
            .map((entry, i, arr) => (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
                  {i < arr.length - 1 && (
                    <span className="my-1 w-px flex-1 bg-line" />
                  )}
                </div>
                <div className="min-w-0 pb-5">
                  <p className="text-[15px] font-medium text-ink">{entry.action}</p>
                  <p className="mt-0.5 text-[13px] text-ink-faint">
                    {entry.actor} · {formatPortalTime(entry.at)}
                  </p>
                </div>
              </li>
            ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
          {t("Internal notes")}
        </h2>
        <p className="mt-1 text-sm text-ink-faint">
          {t("Not visible to the family")}
        </p>
        {app.internalNotes.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {app.internalNotes.map((note) => (
              <li key={note.id} className="rounded-xl bg-bg-soft px-3 py-2.5">
                <p className="text-sm text-ink whitespace-pre-line">{note.body}</p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {note.author} · {formatPortalTime(note.at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            {t("No internal notes yet.")}
          </p>
        )}
      </section>
    </>
  );

  return (
    <div className="min-h-full bg-bg">
      {inReview ? (
        <>
          <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-line bg-bg-soft px-5 py-4 md:px-8">
            <Link
              href="/community/dashboard"
              className="w-fit text-sm text-ink-muted transition hover:text-ink"
            >
              ← {t("Review queue")} / {app.seniorName}
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <ProfileAvatar
                  photoUrl={app.seniorPhotoUrl}
                  initials={initialsFromName(app.seniorName)}
                  size={52}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-[-0.025em] text-ink">
                      {app.seniorName}
                    </h1>
                    <Badge tone={priorityTone(priority)}>{priorityBadgeLabel(priority)}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {catalogLabel(t, applicationCareType(app))}
                    <span className="mx-1.5">·</span>
                    {t("Move-in")}{" "}
                    {app.moveInRequested
                      ? formatPortalDate(app.moveInRequested)
                      : t("Flexible")}
                    {app.publicRef ? (
                      <>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono tracking-wide">{app.publicRef}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              {reviewProgress ? (
                <div className="flex min-w-[160px] flex-1 items-center gap-3 sm:max-w-[220px]">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${reviewProgress.percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted">
                    {reviewProgress.done}/{reviewProgress.total}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push(messageHref)}
                >
                  {t("Ask the family")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!can("acceptDecline")}
                  onClick={() => {
                    setDeclineReason(DECLINE_REASONS[0]);
                    setDeclineNote("");
                    setDeclineOpen(true);
                  }}
                >
                  {t("Decline")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!can("acceptDecline") || !reviewProgress?.complete}
                  onClick={openAcceptModal}
                >
                  {t("Accept")}
                </Button>
              </div>
            </div>

            {flash && (
              <p className="w-fit rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
                {flash}
              </p>
            )}
          </div>

          <AiSummaryBanner
            summary={app.executiveSummary || app.summary}
            aiHighlights={aiHighlights}
            aiFlags={aiFlags}
          />

          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-5 py-6 md:px-8 lg:grid lg:grid-cols-[300px_1fr] lg:items-start xl:grid-cols-[300px_1fr_330px]">
            <ReviewChecklistRail app={app} onToggle={toggleCheck} onOpen={openChecklistSection} />

            <DossierTabs
              active={activeTab}
              onChange={setActiveTab}
              panels={{
                snapshot: (
                  <>
                    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                      <div className="bg-surface p-5">
                        <p className="text-sm text-ink-faint">{t("Age")}</p>
                        <p className="text-[17px] font-semibold text-ink">{app.seniorAge}</p>
                      </div>
                      <div className="bg-surface p-5">
                        <p className="text-sm text-ink-faint">{t("Care type")}</p>
                        <p className="text-[17px] font-semibold text-ink">
                          {catalogLabel(t, applicationCareType(app))}
                        </p>
                      </div>
                      <div className="bg-surface p-5">
                        <p className="text-sm text-ink-faint">{t("Preferred move-in")}</p>
                        <p className="text-[17px] font-semibold text-ink">
                          {app.moveInRequested
                            ? formatPortalDate(app.moveInRequested)
                            : t("Flexible")}
                        </p>
                      </div>
                    </div>

                    <SubCard id="section-identity" title={t("Identity & demographics")}>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label={t("Full name")} value={app.seniorName} />
                        <Field label={t("Age")} value={`${app.seniorAge} years`} />
                        <Field
                          label={t("Date of birth")}
                          value={
                            dossier?.dateOfBirth
                              ? formatPortalDate(dossier.dateOfBirth)
                              : undefined
                          }
                        />
                        <Field
                          label={t("Gender")}
                          value={dossier?.gender ? catalogLabel(t, dossier.gender) : undefined}
                        />
                        <Field label={t("Primary language")} value={dossier?.primaryLanguage} />
                        <Field label={t("Marital status")} value={dossier?.maritalStatus} />
                        <Field label={t("Height")} value={dossier?.height} />
                        <Field label={t("Weight")} value={dossier?.weight} />
                        <Field label={t("Blood type")} value={dossier?.bloodType} />
                        <Field
                          label={t("Care type requested")}
                          value={catalogLabel(t, applicationCareType(app))}
                        />
                        <Field
                          label={t("Preferred move-in")}
                          value={
                            app.moveInRequested
                              ? formatPortalDate(app.moveInRequested)
                              : "Flexible"
                          }
                        />
                        <Field label={t("Referral source")} value={app.referralSource} />
                      </div>
                    </SubCard>

                    <SubCard title={t("ADLs & functional status")}>
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
                          label={t("Mobility aids")}
                          value={dossier?.mobilityAids?.join(" · ")}
                        />
                        <Field label={t("Diet")} value={dossier?.diet} />
                        <Field label={t("Continence")} value={dossier?.continence} />
                        <Field label={t("Hearing / vision")} value={dossier?.hearingVision} />
                        <Field label={t("Fall history")} value={dossier?.fallHistory} />
                        <Field label={t("Smoking / alcohol")} value={dossier?.smokingAlcohol} />
                      </div>
                    </SubCard>

                    <Section id="section-decision" title={t("Decision")}>
                      <p className="text-sm text-ink-muted">
                        {t("Finish the guided checklist, then choose one clear outcome.")}
                      </p>
                      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 md:p-6">
                        {!reviewProgress?.complete ? (
                          <p className="mb-4 rounded-xl bg-warn-soft/50 px-3 py-2.5 text-sm text-ink-secondary">
                            Review still in progress ({reviewProgress?.done}/{reviewProgress?.total}).
                            {t("Check identity, clinical file, medications, documents, family contacts, and")}
                            program fit before approving.
                          </p>
                        ) : (
                          <p className="mb-4 rounded-xl bg-success-soft/60 px-3 py-2.5 text-sm text-success">
                            {t("All review checks complete, ready to finalize.")}
                          </p>
                        )}
                        <div className="grid gap-3 md:grid-cols-3">
                          <button
                            type="button"
                            disabled={!can("acceptDecline") || !reviewProgress?.complete}
                            onClick={openAcceptModal}
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
                                {t("Request information")}
                              </span>
                              <span className="mt-0.5 block text-sm text-ink-muted">
                                {t("Message the family")}
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
                                {t("Select a reason")}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </Section>
                  </>
                ),
                clinical: (
                  <>
                    <SubCard id="section-clinical" title={t("Pathologies & diagnoses")}>
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

                    <SubCard title={t("Allergies")}>
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

                    <SubCard title={t("Cognition & behaviors")}>
                      <div className="grid gap-4 sm:grid-cols-1">
                        <Field label={t("Cognitive notes")} value={dossier?.cognitiveNotes} />
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
                            {t("Care needs")}
                          </p>
                          <div className="mt-2">
                            <ChipList items={app.careNeeds} />
                          </div>
                        </div>
                      </div>
                    </SubCard>

                    <SubCard title={t("Previous establishments & placements")}>
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
                      <SubCard title={t("Hospitalizations")}>
                        <ChipList items={dossier?.hospitalizations || []} />
                      </SubCard>
                      <SubCard title={t("Surgeries")}>
                        <ChipList items={dossier?.surgeries || []} />
                      </SubCard>
                    </div>

                    <SubCard title={t("Vaccinations")}>
                      <ChipList items={dossier?.vaccinations || []} />
                    </SubCard>
                  </>
                ),
                medications: (
                  <SubCard id="section-medications" title={t("Medications")}>
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
                ),
                documents: (
                  <Section id="section-documents" title={t("Documents")}>
                    <p className="text-sm text-ink-muted">
                      {t("Verified before submission. Organized for review, not for collection.")}
                    </p>
                    <div className="flex flex-col gap-6">
                      {DOC_ORDER.map((cat) => {
                        const docs = docsGrouped[cat];
                        if (!docs?.length) return null;
                        return (
                          <div key={cat} className="flex flex-col gap-2.5">
                            <h3 className="text-sm font-semibold text-ink">{t(cat)}</h3>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {docs.map((doc) => (
                                <article
                                  key={doc.id}
                                  className="rounded-2xl border border-line p-4"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-soft">
                                      <FileText size={18} className="text-ink-faint" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-ink">{doc.name}</p>
                                      {doc.aiSummary && (
                                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                          {doc.aiSummary}
                                        </p>
                                      )}
                                      <button
                                        type="button"
                                        disabled
                                        className="mt-2 text-sm font-medium text-brand-strong disabled:opacity-45"
                                      >
                                        {t("Open")}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                ),
                family: (
                  <>
                    <SubCard id="section-family" title={t("Living situation & contacts")}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t("Current address")} value={dossier?.currentAddress} />
                        <Field
                          label={t("Current living situation")}
                          value={dossier?.currentLivingSituation}
                        />
                        <Field
                          label={t("Primary contact")}
                          value={`${app.family.name} · ${catalogLabel(t, app.family.relationship)}\n${app.family.email}${app.family.phone ? ` · ${app.family.phone}` : ""}`}
                        />
                        <Field
                          label={t("Emergency contact")}
                          value={
                            app.emergencyContact
                              ? `${app.emergencyContact.name} · ${catalogLabel(t, app.emergencyContact.relationship)}\n${app.emergencyContact.phone}`
                              : undefined
                          }
                        />
                        <Field label={t("Social supports")} value={dossier?.socialSupports} />
                        <Field label={t("Payment method")} value={app.paymentMethod} />
                      </div>
                    </SubCard>

                    <SubCard title={t("Insurance & clinical contacts")}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t("Primary insurance")} value={dossier?.insurancePrimary} />
                        <Field label={t("Secondary insurance")} value={dossier?.insuranceSecondary} />
                        <Field label={t("Primary physician")} value={dossier?.primaryPhysician} />
                        <Field label={t("Physician phone")} value={dossier?.physicianPhone} />
                        <Field label={t("Pharmacy")} value={dossier?.pharmacy} />
                        <Field label={t("Code status")} value={dossier?.codeStatus} />
                        <Field
                          label={t("Advance directives")}
                          value={dossier?.advanceDirectives}
                        />
                      </div>
                    </SubCard>
                  </>
                ),
              }}
            />

            <aside className="mt-8 flex flex-col gap-6 lg:col-span-2 lg:mt-8 xl:col-span-1 xl:mt-0">
              {familyContactAside}
            </aside>
          </div>
        </>
      ) : (
        <>
          <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-bg-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <Link
              href={inTransition ? "/community/transition" : "/community/dashboard"}
              className="text-sm text-ink-muted transition hover:text-ink"
            >
              ← {inTransition ? t("Transition") : t("Review queue")} / {app.seniorName}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => router.push(messageHref)}
              >
                {t("Ask the family")}
              </Button>
            </div>
          </div>

          <div className="grid min-h-full grid-cols-1 bg-bg lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-8 p-5 md:p-8">
              <div>
                <div className="flex flex-wrap items-start gap-4">
                  <ProfileAvatar
                    photoUrl={app.seniorPhotoUrl}
                    initials={initialsFromName(app.seniorName)}
                    size={60}
                  />
                  <div className="min-w-0">
                    <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
                      {app.seniorName}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={priorityTone(priority)}>{priorityBadgeLabel(priority)}</Badge>
                      <Badge tone="brand">{reviewStatusLabel(app)}</Badge>
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
                      {catalogLabel(t, applicationCareType(app))}
                      <span className="mx-1.5">·</span>
                      {t("Move-in")}{" "}
                      {app.moveInRequested
                        ? formatPortalDate(app.moveInRequested)
                        : t("Flexible")}
                      <span className="mx-1.5">·</span>
                      {t("Submitted")} {formatPortalDate(app.submittedAt)}
                      {app.publicRef ? (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono tracking-wide">{app.publicRef}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                {flash && (
                  <p className="mt-4 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
                    {flash}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                <div className="bg-surface p-5">
                  <p className="text-sm text-ink-faint">{t("Age")}</p>
                  <p className="text-[17px] font-semibold text-ink">{app.seniorAge}</p>
                </div>
                <div className="bg-surface p-5">
                  <p className="text-sm text-ink-faint">{t("Care type")}</p>
                  <p className="text-[17px] font-semibold text-ink">
                    {catalogLabel(t, applicationCareType(app))}
                  </p>
                </div>
                <div className="bg-surface p-5">
                  <p className="text-sm text-ink-faint">{t("Preferred move-in")}</p>
                  <p className="text-[17px] font-semibold text-ink">
                    {app.moveInRequested
                      ? formatPortalDate(app.moveInRequested)
                      : t("Flexible")}
                  </p>
                </div>
              </div>

              {inTransition ? (
                <AdmissionTransitionGuide
                  app={app}
                  closed={false}
                  onToggle={toggleTransitionCheck}
                />
              ) : null}

              <Section id="section-documents" title={t("Documents")}>
                <p className="text-sm text-ink-muted">
                  {t("Verified before submission. Organized for review, not for collection.")}
                </p>
                <div className="flex flex-col gap-6">
                  {DOC_ORDER.map((cat) => {
                    const docs = docsGrouped[cat];
                    if (!docs?.length) return null;
                    return (
                      <div key={cat} className="flex flex-col gap-2.5">
                        <h3 className="text-sm font-semibold text-ink">{t(cat)}</h3>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {docs.map((doc) => (
                            <article
                              key={doc.id}
                              className="rounded-2xl border border-line p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-soft">
                                  <FileText size={18} className="text-ink-faint" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-ink">{doc.name}</p>
                                  {doc.aiSummary && (
                                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                      {doc.aiSummary}
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    disabled
                                    className="mt-2 text-sm font-medium text-brand-strong disabled:opacity-45"
                                  >
                                    {t("Open")}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section title={t("AI executive summary")}>
                <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
                  <p className="text-[15px] leading-relaxed text-ink-secondary whitespace-pre-line">
                    {app.executiveSummary || app.summary}
                  </p>
                </div>
              </Section>

              <Section title={t("Client file")}>
                <p className="text-sm text-ink-muted">
                  {t("Complete dossier submitted with the application, identity, clinical history, medications,")}
                  and prior placements.
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  <SubCard id="section-identity" title={t("Identity & demographics")}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label={t("Full name")} value={app.seniorName} />
                      <Field label={t("Age")} value={`${app.seniorAge} years`} />
                      <Field
                        label={t("Date of birth")}
                        value={
                          dossier?.dateOfBirth
                            ? formatPortalDate(dossier.dateOfBirth)
                            : undefined
                        }
                      />
                      <Field
                        label={t("Gender")}
                        value={dossier?.gender ? catalogLabel(t, dossier.gender) : undefined}
                      />
                      <Field label={t("Primary language")} value={dossier?.primaryLanguage} />
                      <Field label={t("Marital status")} value={dossier?.maritalStatus} />
                      <Field label={t("Height")} value={dossier?.height} />
                      <Field label={t("Weight")} value={dossier?.weight} />
                      <Field label={t("Blood type")} value={dossier?.bloodType} />
                      <Field
                        label={t("Care type requested")}
                        value={catalogLabel(t, applicationCareType(app))}
                      />
                      <Field
                        label={t("Preferred move-in")}
                        value={
                          app.moveInRequested
                            ? formatPortalDate(app.moveInRequested)
                            : "Flexible"
                        }
                      />
                      <Field label={t("Referral source")} value={app.referralSource} />
                    </div>
                  </SubCard>

                  <SubCard id="section-family" title={t("Living situation & contacts")}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("Current address")} value={dossier?.currentAddress} />
                      <Field
                        label={t("Current living situation")}
                        value={dossier?.currentLivingSituation}
                      />
                      <Field
                        label={t("Primary contact")}
                        value={`${app.family.name} · ${catalogLabel(t, app.family.relationship)}\n${app.family.email}${app.family.phone ? ` · ${app.family.phone}` : ""}`}
                      />
                      <Field
                        label={t("Emergency contact")}
                        value={
                          app.emergencyContact
                            ? `${app.emergencyContact.name} · ${catalogLabel(t, app.emergencyContact.relationship)}\n${app.emergencyContact.phone}`
                            : undefined
                        }
                      />
                      <Field label={t("Social supports")} value={dossier?.socialSupports} />
                      <Field label={t("Payment method")} value={app.paymentMethod} />
                    </div>
                  </SubCard>

                  <SubCard title={t("Insurance & clinical contacts")}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("Primary insurance")} value={dossier?.insurancePrimary} />
                      <Field label={t("Secondary insurance")} value={dossier?.insuranceSecondary} />
                      <Field label={t("Primary physician")} value={dossier?.primaryPhysician} />
                      <Field label={t("Physician phone")} value={dossier?.physicianPhone} />
                      <Field label={t("Pharmacy")} value={dossier?.pharmacy} />
                      <Field label={t("Code status")} value={dossier?.codeStatus} />
                      <Field
                        label={t("Advance directives")}
                        value={dossier?.advanceDirectives}
                      />
                    </div>
                  </SubCard>

                  <SubCard id="section-clinical" title={t("Pathologies & diagnoses")}>
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

                  <SubCard id="section-medications" title={t("Medications")}>
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

                  <SubCard title={t("Allergies")}>
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

                  <SubCard title={t("Previous establishments & placements")}>
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
                    <SubCard title={t("Hospitalizations")}>
                      <ChipList items={dossier?.hospitalizations || []} />
                    </SubCard>
                    <SubCard title={t("Surgeries")}>
                      <ChipList items={dossier?.surgeries || []} />
                    </SubCard>
                  </div>

                  <SubCard title={t("ADLs & functional status")}>
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
                        label={t("Mobility aids")}
                        value={dossier?.mobilityAids?.join(" · ")}
                      />
                      <Field label={t("Diet")} value={dossier?.diet} />
                      <Field label={t("Continence")} value={dossier?.continence} />
                      <Field label={t("Hearing / vision")} value={dossier?.hearingVision} />
                      <Field label={t("Fall history")} value={dossier?.fallHistory} />
                      <Field label={t("Smoking / alcohol")} value={dossier?.smokingAlcohol} />
                    </div>
                  </SubCard>

                  <SubCard title={t("Cognition & behaviors")}>
                    <div className="grid gap-4 sm:grid-cols-1">
                      <Field label={t("Cognitive notes")} value={dossier?.cognitiveNotes} />
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
                          {t("Care needs")}
                        </p>
                        <div className="mt-2">
                          <ChipList items={app.careNeeds} />
                        </div>
                      </div>
                    </div>
                  </SubCard>

                  <SubCard title={t("Vaccinations")}>
                    <ChipList items={dossier?.vaccinations || []} />
                  </SubCard>
                </div>
              </Section>

              <Section title={t("Messages")}>
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <p className="text-sm text-ink-muted">
                    {t("Talk with the family inside HavenApply. The conversation stays linked to this")}
                    application.
                  </p>
                  <Button href={messageHref} className="mt-4" size="sm">
                    <MessageSquare size={14} />
                    {t("Open conversation")}
                  </Button>
                </div>
              </Section>

              <Section
                id="section-decision"
                title={inTransition ? "Transition & close" : "Outcome"}
              >
                <p className="text-sm text-ink-muted">
                  {inTransition
                    ? "Complete contracts, payment, and family logistics, then close the dossier."
                    : "This dossier is archived."}
                </p>
                <div className="mt-4 rounded-2xl border border-line bg-surface p-5 md:p-6">
                  {isTerminal ? (
                    <p className="rounded-xl bg-bg-soft px-3 py-3 text-sm text-ink-secondary">
                      {app.status === "closed"
                        ? "Move-in transition complete, dossier closed."
                        : `This application is ${app.status.replaceAll("_", " ")}.`}
                    </p>
                  ) : (
                    <>
                      {!transitionProgress?.complete ? (
                        <p className="mb-4 rounded-xl bg-brand-soft/50 px-3 py-2.5 text-sm text-ink-secondary">
                          Transition in progress ({transitionProgress?.done}/{transitionProgress?.total}
                          ). Finish the residency agreement, deposit, family details, and move-in date.
                        </p>
                      ) : (
                        <p className="mb-4 rounded-xl bg-success-soft/60 px-3 py-2.5 text-sm text-success">
                          {t("All transition steps complete, ready to close the dossier.")}
                        </p>
                      )}

                      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div>
                          <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                            {t("Confirmed move-in date")}
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
                            {t("Save date")}
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
                              {t("Close dossier")}
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
                              {t("Message family")}
                            </span>
                            <span className="mt-0.5 block text-sm text-ink-muted">
                              {t("Contracts, payment, logistics")}
                            </span>
                          </span>
                        </button>

                        <Link
                          href={`/community/transition/${app.id}`}
                          className="flex flex-col items-start gap-3 rounded-xl border border-line bg-bg px-4 py-4 text-left transition hover:border-brand/40 hover:bg-brand-soft/30"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <FileText size={18} />
                          </span>
                          <span>
                            <span className="block text-base font-semibold text-ink">
                              {t("Transition board")}
                            </span>
                            <span className="mt-0.5 block text-sm text-ink-muted">
                              {t("All accepted dossiers")}
                            </span>
                          </span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </Section>
            </div>

            <aside className="flex flex-col gap-8 border-line bg-bg-soft p-5 md:p-8 lg:border-l">
              {familyContactAside}
            </aside>
          </div>
        </>
      )}

      {/* Accept & notify family modal */}
      {auditOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setAuditOpen(false)}
            aria-hidden
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-lg">
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">
              {t("Accept & notify family")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t(
                "Review the default email and text, edit if needed, then confirm to accept and send.",
              )}
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <div className="rounded-2xl border border-line p-4">
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{t("Email")}</span>
                  <span className="flex items-center gap-2 font-medium text-ink-secondary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                    {t("Send email")}
                  </span>
                </label>
                {sendEmail ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <label className="block text-sm">
                      <span className="text-ink-muted">{t("To")}</span>
                      <input
                        type="email"
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-muted">{t("Subject")}</span>
                      <input
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-muted">{t("Message")}</span>
                      <textarea
                        rows={7}
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-faint">
                    {t("Email will not be sent.")}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-line p-4">
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{t("Text message (SMS)")}</span>
                  <span className="flex items-center gap-2 font-medium text-ink-secondary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                    />
                    {t("Send text")}
                  </span>
                </label>
                {sendSms ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <label className="block text-sm">
                      <span className="text-ink-muted">{t("Phone")}</span>
                      <input
                        type="tel"
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                        value={smsTo}
                        onChange={(e) => setSmsTo(e.target.value)}
                        placeholder={t("Family mobile number")}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-muted">{t("Message")}</span>
                      <textarea
                        rows={4}
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                        value={smsBody}
                        onChange={(e) => setSmsBody(e.target.value)}
                      />
                    </label>
                    <p className="text-xs text-ink-faint">
                      {smsBody.length}/160 {t("characters (SMS may split if longer)")}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-faint">
                    {t("Text message will not be sent.")}
                  </p>
                )}
              </div>

              <label className="block text-sm">
                <span className="font-medium text-ink">
                  {t("Internal notes (optional)")}
                </span>
                <textarea
                  rows={2}
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder={t("Notes for your team…")}
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setAuditOpen(false)}
              >
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!reviewProgress?.complete}
                onClick={confirmApprove}
              >
                {t("Confirm & send")}
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
              {t("Choose a reason. The family receives a clear update in HavenApply.")}
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
                className="mt-1.5 w-full rounded-2xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeclineOpen(false)}
              >
                {t("Cancel")}
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
              {t("Confirm that contracts, payment, and move-in details are complete. The dossier moves")}
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
                className="mt-1.5 w-full rounded-2xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder={t("e.g. Move-in May 12 · deposit received")}
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setCloseOpen(false)}
              >
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!transitionProgress?.complete}
                onClick={confirmClose}
              >
                {t("Close dossier")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
