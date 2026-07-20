"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lock,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { residences, getResidence } from "@/data/residences";
import { useAuth } from "@/lib/auth";
import { buildCareNeedsSummary } from "@/lib/care-needs";
import { categoryLabel } from "@/lib/document-vault";
import { useFamilyData } from "@/lib/family-data";
import {
  APPLY_REQUIRED_DOCS,
  APPLY_STEPS,
  communityQuestions,
  emptyDraftApplication,
  hasActiveSubmission,
  requirementGaps,
  type FamilyApplication,
} from "@/lib/family-applications";
import {
  FUNDING_MODES,
  URGENCY_OPTIONS,
  labelForId,
  seniorAge,
  seniorDisplayName,
} from "@/lib/senior-profile";
import { cn, formatCurrency } from "@/lib/utils";

function ApplyWizard() {
  const params = useSearchParams();
  const { user } = useAuth();
  const {
    ready,
    data,
    updateSeniorDraft,
    upsertApplication,
    submitApplication,
  } = useFamilyData();

  const residenceId = params.get("residence") || "";
  const residence = residenceId ? getResidence(residenceId) : undefined;

  const existingActive = residence
    ? hasActiveSubmission(data.applications, residence.id)
    : undefined;

  const existingDraft = residence
    ? data.applications.find((a) => a.residenceId === residence.id && a.status === "draft")
    : undefined;

  const [draft, setDraft] = useState<FamilyApplication | null>(null);
  const [step, setStep] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedApp, setSubmittedApp] = useState<FamilyApplication | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const initKey = useRef<string>("");

  const seniorName = seniorDisplayName(data.senior) || data.person.name || "Senior";
  const careSummary = useMemo(() => buildCareNeedsSummary(data.careNeeds), [data.careNeeds]);
  const questions = useMemo(
    () => (residence ? communityQuestions(residence.id) : []),
    [residence],
  );

  // Initialize draft once per residence
  useEffect(() => {
    if (!ready || !residence) return;
    const key = residence.id;
    if (initKey.current === key && draft) return;

    if (existingActive) {
      initKey.current = key;
      return;
    }

    if (existingDraft) {
      setDraft(existingDraft);
      setStep(Math.min(existingDraft.draftStep, APPLY_STEPS.length - 2));
      initKey.current = key;
      return;
    }

    const created = emptyDraftApplication(residence, {
      name: user?.name || "",
      email: user?.email || "",
    });
    if (data.senior.urgency) {
      created.desiredMoveIn = labelForId(URGENCY_OPTIONS, data.senior.urgency) || "";
    }
    created.familyAccess = [
      user?.name || "Primary account holder",
      data.person.relationship
        ? `${data.person.name || seniorName}'s ${data.person.relationship}`
        : "",
    ].filter(Boolean);
    setDraft(created);
    upsertApplication(created);
    initKey.current = key;
  }, [
    ready,
    residence,
    existingActive,
    existingDraft,
    user?.name,
    user?.email,
    data.senior.urgency,
    data.person,
    seniorName,
    upsertApplication,
    draft,
  ]);

  const markSaved = useCallback(() => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  const patchDraft = useCallback(
    (partial: Partial<FamilyApplication>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
          upsertApplication(next);
          markSaved();
        }, 400);
        return next;
      });
    },
    [upsertApplication, markSaved],
  );

  const attachedDocs = useMemo(() => {
    if (!draft) return [];
    return data.documents.filter((d) => draft.attachedDocumentIds.includes(d.id));
  }, [draft, data.documents]);

  const gaps = useMemo(() => {
    if (!residence || !draft) return null;
    return requirementGaps(
      residence,
      attachedDocs.map((d) => d.category),
      careSummary.mustHaves.some((m) => /memory|dementia|alzheim/i.test(m)),
    );
  }, [residence, draft, attachedDocs, careSummary.mustHaves]);

  const goNext = () => {
    if (!draft) return;
    const nextStep = Math.min(step + 1, APPLY_STEPS.length - 2);
    patchDraft({ draftStep: nextStep });
    setStep(nextStep);
  };

  const goBack = () => {
    const nextStep = Math.max(step - 1, 0);
    patchDraft({ draftStep: nextStep });
    setStep(nextStep);
  };

  const canSubmit =
    draft &&
    draft.consentShare &&
    draft.consentAccurate &&
    draft.signatureName.trim().length >= 2 &&
    !submitting;

  const onSubmit = () => {
    if (!draft || !canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    const result = submitApplication({
      ...draft,
      submittedByName: user?.name || draft.signatureName,
      submittedByEmail: user?.email || draft.submittedByEmail,
    });
    if (!result) {
      setSubmitError(
        "An application for this community was already submitted. Open Applications to track it.",
      );
      setSubmitting(false);
      return;
    }
    setSubmittedApp(result);
    setStep(APPLY_STEPS.length - 1);
    setSubmitting(false);
    markSaved();
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading application…
      </div>
    );
  }

  if (!residenceId || !residence) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">Choose a community</h1>
        <p className="mt-2 text-ink-muted">
          Applications start from a community page so requirements and documents stay accurate.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {residences.slice(0, 4).map((r) => (
            <Button key={r.id} href={`/apply?residence=${r.id}`} variant="secondary" size="sm">
              {r.name}
            </Button>
          ))}
        </div>
        <Button href="/family/find-communities" className="mt-6">
          Browse all communities
        </Button>
      </div>
    );
  }

  if (existingActive && !submittedApp) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <CheckCircle2 className="mx-auto text-success" size={40} />
        <h1 className="mt-4 text-2xl font-semibold">Already submitted</h1>
        <p className="mt-2 text-ink-muted">
          You already have an active application for {residence.name} (
          {existingActive.submittedDateLabel || existingActive.status}). Accidental double
          submissions are blocked.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/family/applications">View applications</Button>
          <Button href={`/find-senior-living/${residence.id}`} variant="secondary">
            Community page
          </Button>
        </div>
      </div>
    );
  }

  const current = APPLY_STEPS[step];
  const isSent = current.id === "sent" || Boolean(submittedApp);
  const progress = ((Math.min(step, APPLY_STEPS.length - 2) + 1) / (APPLY_STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl">
            <Image src={residence.image} alt="" fill className="object-cover" sizes="56px" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Start application
            </p>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {residence.name}
            </h1>
            <p className="text-sm text-ink-muted">
              {residence.city}, {residence.state} · for {seniorName}
            </p>
          </div>
        </div>
        <p className={cn("text-sm", savedFlash ? "text-brand" : "text-ink-faint")} aria-live="polite">
          {savedFlash ? "Draft saved" : "Autosave on"}
        </p>
      </div>

      {!isSent && (
        <>
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Step {step + 1} of {APPLY_STEPS.length - 1} · {current.title}
            </p>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {APPLY_STEPS.slice(0, -1).map((s, i) => (
              <button
                key={s.id}
                type="button"
                disabled={i > step}
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  i === step
                    ? "bg-brand text-white"
                    : i < step
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-bg text-ink-faint",
                )}
              >
                {s.short}
              </button>
            ))}
          </div>
        </>
      )}

      <Card className="mt-6 p-5 md:p-7">
        {/* STEP 1 — Profile */}
        {current.id === "profile" && draft && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Verify what will be shared</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Correct anything before continuing. Edits update your family profile where noted.
              </p>
            </header>

            <section className="rounded-xl border border-line bg-bg px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Personal information</h3>
                <Link href="/family/senior-profile" className="text-xs font-medium text-brand">
                  Edit profile
                </Link>
              </div>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-faint">Senior</dt>
                  <dd className="font-medium">{seniorName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Age</dt>
                  <dd className="font-medium">{seniorAge(data.senior) || data.person.age || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Location</dt>
                  <dd className="font-medium">
                    {[data.senior.city, data.senior.state].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Your relationship</dt>
                  <dd className="font-medium">
                    {data.senior.relationship || data.person.relationship || "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-line bg-bg px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Care needs</h3>
                <Link href="/family/care-needs" className="text-xs font-medium text-brand">
                  Edit care needs
                </Link>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {careSummary.supportBlurb || careSummary.priorities[0] || "Care needs summary not completed yet."}
              </p>
              {careSummary.mustHaves.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {careSummary.mustHaves.slice(0, 5).map((m) => (
                    <Badge key={m} tone="brand">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-line bg-bg px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Budget</h3>
                <Link href="/onboarding" className="text-xs font-medium text-brand">
                  Update budget
                </Link>
              </div>
              <p className="mt-2 text-sm font-medium">
                {data.senior.budgetUnsure
                  ? "Budget still exploring"
                  : data.senior.budgetMin || data.senior.budgetMax
                    ? `${data.senior.budgetMin ? formatCurrency(Number(data.senior.budgetMin)) : "—"} – ${
                        data.senior.budgetMax
                          ? formatCurrency(Number(data.senior.budgetMax))
                          : "—"
                      } / mo`
                    : "Not set"}
              </p>
              {data.senior.fundingModes.length > 0 && (
                <p className="mt-1 text-xs text-ink-muted">
                  Funding:{" "}
                  {data.senior.fundingModes
                    .map((id) => labelForId(FUNDING_MODES, id) || id)
                    .join(", ")}
                </p>
              )}
            </section>

            <label className="block">
              <span className="text-sm font-semibold">Desired move-in / timeline</span>
              <input
                value={draft.desiredMoveIn}
                onChange={(e) => {
                  patchDraft({ desiredMoveIn: e.target.value });
                  updateSeniorDraft({ urgency: data.senior.urgency });
                }}
                placeholder="e.g. Within 30 days · mid-August"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </label>

            <section className="rounded-xl border border-line bg-bg px-4 py-3">
              <h3 className="text-sm font-semibold">Family contacts</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                <li>
                  Primary submitter: {user?.name || "You"} ({user?.email || "signed-in account"})
                </li>
                {(data.sections.find((s) => s.id === "emergency")?.items || [])
                  .slice(0, 3)
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                {(data.sections.find((s) => s.id === "emergency")?.items.length || 0) === 0 && (
                  <li>
                    No emergency contacts on profile yet —{" "}
                    <Link href="/family/senior-profile" className="text-brand">
                      add them
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          </div>
        )}

        {/* STEP 2 — Requirements */}
        {current.id === "requirements" && gaps && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Community requirements</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Review admission criteria, documents, fees, and any fit concerns before attaching
                files.
              </p>
            </header>

            <ReqBlock title="Admission criteria" items={gaps.criteria} />
            <ReqBlock title="Required documents" items={gaps.documents} />
            <ReqBlock title="Additional forms" items={gaps.extraForms} />

            <div className="rounded-xl border border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Possible fees</h3>
              <p className="mt-1 text-sm text-ink-muted">{gaps.fees}</p>
            </div>

            {gaps.incompatibilities.length > 0 && (
              <div className="rounded-xl border border-warn/40 bg-warn-soft/40 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-warn">
                  <AlertTriangle size={16} /> Possible incompatibilities
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                  {gaps.incompatibilities.map((x) => (
                    <li key={x}>· {x}</li>
                  ))}
                </ul>
              </div>
            )}

            {gaps.missingDocs.length > 0 && (
              <div className="rounded-xl border border-dashed border-line bg-bg px-4 py-3">
                <p className="text-sm font-semibold">Missing from vault (common asks)</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                  {gaps.missingDocs.map((x) => (
                    <li key={x}>· {x}</li>
                  ))}
                </ul>
                <Button href="/family/documents" size="sm" variant="soft" className="mt-3">
                  Open document vault
                </Button>
              </div>
            )}

            {gaps.notAccepted.length > 0 && (
              <ReqBlock title="Often not accepted" items={gaps.notAccepted} warn />
            )}
          </div>
        )}

        {/* STEP 3 — Documents */}
        {current.id === "documents" && draft && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Attach documents</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Only selected files are shared with {residence.name}. Your full vault stays private
                by default.
              </p>
            </header>

            <div className="flex items-start gap-2 rounded-xl bg-brand-soft/50 px-3 py-2.5 text-sm text-ink">
              <Lock size={16} className="mt-0.5 shrink-0 text-brand" />
              Nothing is sent automatically. Unchecked documents remain private on this device.
            </div>

            {data.documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center">
                <FileText className="mx-auto text-ink-faint" size={28} />
                <p className="mt-3 font-medium">Vault is empty</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Upload documents first, then return here to attach them.
                </p>
                <Button href="/family/documents" className="mt-4" size="sm">
                  Go to Documents
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.documents.map((doc) => {
                  const on = draft.attachedDocumentIds.includes(doc.id);
                  const recommended = APPLY_REQUIRED_DOCS.some((r) => r.category === doc.category);
                  return (
                    <li key={doc.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                          on ? "border-brand bg-brand-soft/40" : "border-line bg-surface",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-[var(--brand)]"
                          checked={on}
                          onChange={() => {
                            const ids = on
                              ? draft.attachedDocumentIds.filter((id) => id !== doc.id)
                              : [...draft.attachedDocumentIds, doc.id];
                            patchDraft({ attachedDocumentIds: ids });
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{doc.name}</span>
                            {recommended && <Badge tone="warn">Often required</Badge>}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {categoryLabel(doc.category)} · {doc.size} · {doc.status}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-ink-faint">
              {draft.attachedDocumentIds.length} document
              {draft.attachedDocumentIds.length === 1 ? "" : "s"} selected for this application.
            </p>
          </div>
        )}

        {/* STEP 4 — Questions */}
        {current.id === "questions" && draft && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Questions from {residence.name}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Answers autosave to this draft application.
              </p>
            </header>
            {questions.map((q) => (
              <label key={q.id} className="block">
                <span className="text-sm font-medium">
                  {q.label}
                  {q.required ? <span className="text-danger"> *</span> : null}
                </span>
                {q.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={draft.specificAnswers[q.id] || ""}
                    onChange={(e) =>
                      patchDraft({
                        specificAnswers: {
                          ...draft.specificAnswers,
                          [q.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={q.placeholder}
                    className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                ) : q.type === "select" ? (
                  <select
                    value={draft.specificAnswers[q.id] || ""}
                    onChange={(e) =>
                      patchDraft({
                        specificAnswers: {
                          ...draft.specificAnswers,
                          [q.id]: e.target.value,
                        },
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  >
                    <option value="">Select…</option>
                    {(q.options || []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={draft.specificAnswers[q.id] || ""}
                    onChange={(e) =>
                      patchDraft({
                        specificAnswers: {
                          ...draft.specificAnswers,
                          [q.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={q.placeholder}
                    className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {/* STEP 5 — Authorizations */}
        {current.id === "authorizations" && draft && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Authorizations</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Confirm you may share this information and that it is accurate.
              </p>
            </header>

            <label className="flex cursor-pointer gap-3 rounded-xl border border-line px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--brand)]"
                checked={draft.consentShare}
                onChange={(e) => patchDraft({ consentShare: e.target.checked })}
              />
              <span className="text-sm">
                <span className="font-medium">Consent to share</span>
                <span className="mt-0.5 block text-ink-muted">
                  I am authorized to share {seniorName}&apos;s profile, selected documents, and care
                  information with {residence.name} for admissions review.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer gap-3 rounded-xl border border-line px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--brand)]"
                checked={draft.consentAccurate}
                onChange={(e) => patchDraft({ consentAccurate: e.target.checked })}
              />
              <span className="text-sm">
                <span className="font-medium">Accuracy confirmation</span>
                <span className="mt-0.5 block text-ink-muted">
                  To the best of my knowledge, the information in this application is true and
                  complete.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <PenLine size={14} /> Electronic signature
              </span>
              <input
                value={draft.signatureName}
                onChange={(e) => patchDraft({ signatureName: e.target.value })}
                placeholder="Type your full legal name"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 font-serif text-lg italic outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Date of signature will be recorded as {new Date().toLocaleDateString()} · Identity:{" "}
                {user?.email || "signed-in family account"}
              </p>
            </label>

            <div className="flex items-start gap-2 rounded-xl bg-bg px-3 py-2.5 text-xs text-ink-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand" />
              Haven records consent locally for this demo. Communities remain the decision-makers for
              admission.
            </div>
          </div>
        )}

        {/* STEP 6 — Summary */}
        {current.id === "summary" && draft && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Review before sending</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Exactly what will be sent to {residence.name}.
              </p>
            </header>

            <SummaryRow label="Community" value={residence.name} />
            <SummaryRow
              label="Senior profile"
              value={`${seniorName} · care needs · budget · timeline (${draft.desiredMoveIn || "not set"})`}
            />
            <SummaryRow
              label="Documents attached"
              value={
                attachedDocs.length
                  ? attachedDocs.map((d) => d.name).join(", ")
                  : "None — vault not auto-shared"
              }
            />
            <SummaryRow
              label="Specific answers"
              value={`${Object.values(draft.specificAnswers).filter(Boolean).length} of ${questions.length} questions answered`}
            />
            <SummaryRow
              label="Family access"
              value={draft.familyAccess.join(" · ") || "Primary account only"}
            />
            <SummaryRow
              label="Submitted by"
              value={`${draft.signatureName || user?.name || "—"} · ${user?.email || ""}`}
            />

            <div className="rounded-xl border border-line bg-bg px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList size={16} /> Next steps after send
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink-muted">
                <li>Application appears on your family dashboard and Applications list.</li>
                <li>Confirmation is recorded for you (demo inbox / on-device notice).</li>
                <li>{residence.name} is notified as a Haven partner inquiry (demo).</li>
                <li>Admissions may request more documents or schedule an assessment.</li>
              </ol>
            </div>

            {submitError && (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
          </div>
        )}

        {/* STEP 7 — Sent */}
        {(current.id === "sent" || submittedApp) && (submittedApp || draft) && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
              <Check size={32} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Application submitted</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-muted">
              Sent to {(submittedApp || draft)!.residenceName} on{" "}
              {(submittedApp || draft)!.submittedDateLabel}. Confirmation recorded · community
              notified (demo).
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-xl border border-line bg-bg px-4 py-3 text-left text-sm">
              <p>
                <span className="text-ink-faint">Application ID · </span>
                {(submittedApp || draft)!.id}
              </p>
              <p className="mt-1">
                <span className="text-ink-faint">Signed by · </span>
                {(submittedApp || draft)!.signatureName}
              </p>
              <p className="mt-1">
                <span className="text-ink-faint">Documents · </span>
                {(submittedApp || draft)!.attachedDocumentIds.length}
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button href="/family/applications" size="lg">
                View in Applications
              </Button>
              <Button href="/family/dashboard" variant="secondary" size="lg">
                Family dashboard
              </Button>
              <Button
                href={`/find-senior-living/${residence.id}`}
                variant="ghost"
                size="lg"
              >
                Community page
              </Button>
            </div>
          </div>
        )}

        {/* Nav */}
        {!isSent && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={goBack}>
              Back
            </Button>
            {current.id === "summary" ? (
              <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
                {submitting ? "Sending…" : "Submit application"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            )}
          </div>
        )}
      </Card>

      {!isSent && current.id === "summary" && !canSubmit && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          Complete consent checkboxes and electronic signature on the Authorizations step to submit.
        </p>
      )}
    </div>
  );
}

function ReqBlock({
  title,
  items,
  warn,
}: {
  title: string;
  items: string[];
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        warn ? "border-warn/30 bg-warn-soft/20" : "border-line",
      )}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-ink-muted">
        {items.map((x) => (
          <li key={x}>· {x}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="text-sm font-medium sm:text-right">{value}</p>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading application…
        </div>
      }
    >
      <ApplyWizard />
    </Suspense>
  );
}
