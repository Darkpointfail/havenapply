"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TransitionStepPanel } from "@/components/community/transition/TransitionStepPanels";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  formatPortalDate,
  formatPortalTime,
  initialsFromName,
  isTransitionApplication,
} from "@/lib/community-portal";
import {
  agreementStatusLabel,
  ensureTransitionWork,
  familyStatusLabel,
  moveInStatusLabel,
  paymentStatusLabel,
  stepCompleteFromWork,
  transitionProgressDetail,
  type TransitionStepId,
  type TransitionWork,
} from "@/lib/community-transition";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

const STEP_META: {
  id: TransitionStepId;
  title: string;
  description: string;
  primaryCta: (work: TransitionWork) => string;
}[] = [
  {
    id: "contract",
    title: "Residency agreement",
    description: "Generate, send, collect signatures, and verify the contract.",
    primaryCta: (w) => {
      if (w.agreement.status === "not_started") return "Generate agreement";
      if (w.agreement.status === "draft") return "Send for signature";
      if (w.agreement.status === "signed") return "Verify agreement";
      if (w.agreement.status === "verified") return "View agreement";
      return "Continue agreement";
    },
  },
  {
    id: "payment",
    title: "Deposit & payment",
    description: "Request the deposit, track payment, and confirm the method.",
    primaryCta: (w) => {
      if (w.payment.status === "not_started") return "Request deposit";
      if (w.payment.status === "paid") return "Verify deposit";
      if (w.payment.status === "verified") return "View payment";
      return "Record payment";
    },
  },
  {
    id: "familyDetails",
    title: "Final family details",
    description: "Contacts, pharmacy, belongings, preferences, and logistics.",
    primaryCta: (w) => {
      if (w.familyDetails.status === "not_started") return "Request family details";
      if (w.familyDetails.status === "submitted") return "Review submitted details";
      if (w.familyDetails.status === "verified") return "View details";
      return "Continue family details";
    },
  },
  {
    id: "moveInDate",
    title: "Move-in date",
    description: "Propose dates, confirm the unit, and prepare arrival day.",
    primaryCta: (w) => {
      if (w.moveIn.status === "not_started") return "Propose move-in date";
      if (["proposed", "waiting_family", "rescheduled"].includes(w.moveIn.status))
        return "Confirm move-in";
      if (w.moveIn.status === "confirmed") return "Mark ready for move-in";
      return "View move-in plan";
    },
  },
];

function statusLabelFor(stepId: TransitionStepId, work: TransitionWork) {
  if (stepId === "contract") return agreementStatusLabel(work.agreement.status);
  if (stepId === "payment") return paymentStatusLabel(work.payment.status);
  if (stepId === "familyDetails") return familyStatusLabel(work.familyDetails.status);
  return moveInStatusLabel(work.moveIn.status);
}

function assigneeFor(stepId: TransitionStepId, work: TransitionWork) {
  if (stepId === "contract") return work.agreement.assignee;
  if (stepId === "payment") return work.payment.assignee;
  if (stepId === "familyDetails") return work.familyDetails.assignee;
  return work.moveIn.assignee;
}

function lastActivityFor(stepId: TransitionStepId, work: TransitionWork) {
  const hit = work.timeline.find((t) => t.stepId === stepId) || work.timeline[0];
  return hit?.at || null;
}

function missingFor(stepId: TransitionStepId, work: TransitionWork): string[] {
  if (stepId === "contract") {
    if (work.agreement.status === "verified") return [];
    if (work.agreement.status === "not_started") return ["Agreement not generated"];
    if (work.agreement.status === "draft") return ["Not sent for signature"];
    if (["sent", "viewed", "partially_signed"].includes(work.agreement.status))
      return ["Awaiting signature"];
    if (work.agreement.status === "signed") return ["Verification pending"];
  }
  if (stepId === "payment") {
    if (work.payment.status === "verified") return [];
    const gaps = [];
    if (work.payment.amountReceived < work.payment.amountDue) gaps.push("Deposit incomplete");
    if (!work.payment.methodConfirmed.trim()) gaps.push("Payment method not confirmed");
    if (work.payment.status === "not_started") gaps.push("No payment request yet");
    return gaps;
  }
  if (stepId === "familyDetails") {
    if (work.familyDetails.status === "verified") return [];
    if (work.familyDetails.status === "not_started") return ["Details not requested"];
    if (["requested", "family_completing"].includes(work.familyDetails.status))
      return ["Waiting on family"];
    if (work.familyDetails.status === "submitted") return ["Staff verification needed"];
    if (work.familyDetails.status === "changes_requested") return ["Corrections outstanding"];
  }
  if (stepId === "moveInDate") {
    if (["confirmed", "ready"].includes(work.moveIn.status) && work.moveIn.confirmedDate) return [];
    if (!work.moveIn.confirmedDate) return ["Date not confirmed"];
    if (!work.moveIn.unitAvailable) return ["Unit availability not confirmed"];
    return ["Confirmation pending"];
  }
  return [];
}

export function CommunityTransitionWorkspace() {

  const t = useT();  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const { ready, workspace, getApplication, saveTransitionWork, completeTransition } =
    useCommunityPortal();
  const app = getApplication(id);
  const [openStep, setOpenStep] = useState<TransitionStepId | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const work = useMemo(
    () => (app ? ensureTransitionWork(app, workspace?.profile) : null),
    [app, workspace?.profile],
  );

  const progress = work ? transitionProgressDetail(work) : null;
  const doneMap = work ? stepCompleteFromWork(work) : null;

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Opening transition…")}
      </div>
    );
  }

  if (!app || !work || !progress || !doneMap) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-lg font-semibold">Transition dossier not found</p>
        <Button href="/community/transition" className="mt-4" size="sm">
          {t("Back to Transition")}
        </Button>
      </div>
    );
  }

  if (!isTransitionApplication(app) && app.status !== "closed") {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-lg font-semibold">This dossier is not in transition</p>
        <Button href={`/community/applications/${app.id}`} className="mt-4" size="sm">
          {t("Open application")}
        </Button>
      </div>
    );
  }

  const save = (
    updater: (prev: TransitionWork) => TransitionWork,
    timelineAction?: string,
    timelineDetail?: string,
  ) => {
    const r = saveTransitionWork(
      app.id,
      updater,
      timelineAction,
      timelineDetail,
      openStep || undefined,
    );
    if (!r.ok) setFlash(r.error || "Could not save");
  };

  const confirmClose = () => {
    const r = completeTransition(app.id, closeNote.trim() || undefined);
    if (r.ok) {
      setCloseOpen(false);
      setFlash("Dossier closed, moved to History");
      window.setTimeout(() => router.push("/community/applications?filter=history"), 900);
    } else {
      setFlash(r.error || "Could not close");
    }
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[920px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        <div>
          <Link
            href="/community/transition"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={14} />
            {t("All transitions")}
          </Link>

          <div className="mt-5 flex flex-wrap items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-strong">
              {initialsFromName(app.seniorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-muted">Move-in transition</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                {app.seniorName}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {app.family.name} · {app.careType || "Assisted living"}
                {app.moveInRequested ? ` · Preferred ${formatPortalDate(app.moveInRequested)}` : ""}
              </p>
            </div>
            <Button href={`/community/applications/${app.id}`} size="sm" variant="secondary">
              {t("Full dossier")}
            </Button>
          </div>
        </div>

        {flash ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success">{flash}</p>
        ) : null}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                Transition {progress.complete} of {progress.total} complete
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Next action: {progress.next.label}.
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-brand">{progress.percent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-faint">
            <span>{progress.waiting} waiting on family</span>
            <span>{progress.blocked} still with admissions</span>
            {progress.urgent.map((u) => (
              <span key={u} className="font-medium text-warn">
                {u}
              </span>
            ))}
          </div>
          {!progress.allComplete ? (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={() => setOpenStep(progress.next.stepId)}
            >
              {STEP_META.find((s) => s.id === progress.next.stepId)?.primaryCta(work) ||
                "Continue"}
            </Button>
          ) : (
            <Button type="button" size="sm" className="mt-4" onClick={() => setCloseOpen(true)}>
              {t("Close dossier")}
            </Button>
          )}
        </section>

        <section className="space-y-3">
          {STEP_META.map((step, index) => {
            const complete = doneMap[step.id];
            const status = statusLabelFor(step.id, work);
            const missing = missingFor(step.id, work);
            const activity = lastActivityFor(step.id, work);
            const emails = work.emails.filter((e) => e.stepId === step.id).slice(0, 2);
            return (
              <article
                key={step.id}
                className={cn(
                  "rounded-2xl border bg-surface p-5 shadow-xs transition",
                  complete ? "border-brand/25" : "border-line",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink-faint">
                        Step {index + 1}
                      </span>
                      <Badge tone={complete ? "success" : "brand"}>{status}</Badge>
                    </div>
                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
                      {step.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">{step.description}</p>
                    <p className="mt-2 text-xs text-ink-faint">
                      Owner: {assigneeFor(step.id, work)}
                      {activity ? ` · Updated ${formatPortalTime(activity)}` : ""}
                    </p>
                    {missing.length > 0 ? (
                      <p className="mt-2 text-xs text-warn">Missing: {missing.join(" · ")}</p>
                    ) : (
                      <p className="mt-2 text-xs text-success">Complete with verified proof</p>
                    )}
                    {emails.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-faint">
                        Latest email: {emails[0].subject}
                      </p>
                    ) : null}
                  </div>
                  <Button type="button" size="sm" onClick={() => setOpenStep(step.id)}>
                    {step.primaryCta(work)}
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Timeline</h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!progress.allComplete}
              onClick={() => setCloseOpen(true)}
            >
              {t("Close dossier")}
            </Button>
          </div>
          <ol className="mt-5 space-y-0">
            {work.timeline.slice(0, 20).map((entry, i) => (
              <li key={entry.id} className="grid grid-cols-[16px_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 rounded-full",
                      i === 0 ? "bg-brand" : "bg-line-strong",
                    )}
                  />
                  {i < Math.min(work.timeline.length, 20) - 1 ? (
                    <span className="w-px flex-1 bg-line" />
                  ) : null}
                </div>
                <div className="min-w-0 pb-4">
                  <p className="text-sm font-medium text-ink">{entry.action}</p>
                  {entry.detail ? (
                    <p className="mt-0.5 text-xs text-ink-muted">{entry.detail}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {entry.actor} · {formatPortalTime(entry.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {openStep ? (
        <TransitionStepPanel
          stepId={openStep}
          app={app}
          work={work}
          profile={workspace.profile}
          onSave={save}
          onClose={() => setOpenStep(null)}
        />
      ) : null}

      {closeOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="absolute inset-0" onClick={() => setCloseOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <h2 className="text-xl font-semibold tracking-tight">Close dossier</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t("Confirm that move-in preparation is complete. The resident can move to upcoming")}
              move-ins and this admission file is archived.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Residency agreement signed & verified",
                "Deposit received & payment method confirmed",
                "Family details verified",
                "Move-in date confirmed",
              ].map((label) => (
                <li
                  key={label}
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
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
                placeholder={t("e.g. Suite 214 · family confirmed parking")}
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
                disabled={!progress.allComplete}
                onClick={confirmClose}
              >
                {t("Confirm close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
