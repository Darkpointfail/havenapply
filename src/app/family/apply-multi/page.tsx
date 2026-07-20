"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Layers,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getResidence, residences } from "@/data/residences";
import { useAuth } from "@/lib/auth";
import { categoryLabel } from "@/lib/document-vault";
import { useFamilyData } from "@/lib/family-data";
import {
  communityQuestions,
  emptyDraftApplication,
  hasActiveSubmission,
  type FamilyApplication,
} from "@/lib/family-applications";
import {
  MULTI_APPLY_MAX,
  MULTI_APPLY_STEPS,
  commonRequirementLabels,
  computeDestinationPrep,
  prepStatusLabel,
  specificRequirements,
} from "@/lib/multi-apply";
import { labelForId, URGENCY_OPTIONS, seniorDisplayName } from "@/lib/senior-profile";
import { cn } from "@/lib/utils";

function MultiApplyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { ready, data, submitApplicationBatch } = useFamilyData();

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FamilyApplication>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sharedDocIds, setSharedDocIds] = useState<string[]>([]);
  const [desiredMoveIn, setDesiredMoveIn] = useState("");
  const [consentShare, setConsentShare] = useState(false);
  const [consentAccurate, setConsentAccurate] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [sending, setSending] = useState(false);
  const [sentApps, setSentApps] = useState<FamilyApplication[]>([]);

  // Prefill from ?ids=
  useEffect(() => {
    const raw = params.get("ids") || "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((id) => getResidence(id))
      .slice(0, MULTI_APPLY_MAX);
    if (ids.length) {
      setSelectedIds(ids);
      setFocusId(ids[0]);
    } else if (data.compareIds.length) {
      setSelectedIds(data.compareIds.slice(0, MULTI_APPLY_MAX));
      setFocusId(data.compareIds[0]);
    } else if (data.savedFavorites.length) {
      const fromSaved = data.savedFavorites.map((f) => f.communityId).slice(0, MULTI_APPLY_MAX);
      setSelectedIds(fromSaved);
      setFocusId(fromSaved[0] || null);
    }
    if (data.senior.urgency) {
      setDesiredMoveIn(labelForId(URGENCY_OPTIONS, data.senior.urgency) || "");
    }
    if (user?.name) setSignatureName(user.name);
  }, [params, data.compareIds, data.savedFavorites, data.senior.urgency, user?.name]);

  // Sync drafts when selection changes
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, FamilyApplication> = {};
      for (const id of selectedIds) {
        const r = getResidence(id);
        if (!r) continue;
        next[id] =
          prev[id] ||
          emptyDraftApplication(r, {
            name: user?.name || "",
            email: user?.email || "",
          });
      }
      return next;
    });
    if (focusId && !selectedIds.includes(focusId)) {
      setFocusId(selectedIds[0] || null);
    }
  }, [selectedIds, user?.name, user?.email, focusId]);

  const selected = useMemo(
    () => selectedIds.map((id) => getResidence(id)).filter(Boolean) as NonNullable<
      ReturnType<typeof getResidence>
    >[],
    [selectedIds],
  );

  const commonDocs = useMemo(() => commonRequirementLabels(selected), [selected]);

  const preps = useMemo(() => {
    return selected.map((r) => {
      const draft = drafts[r.id];
      if (!draft) return null;
      const merged: FamilyApplication = {
        ...draft,
        desiredMoveIn,
        consentShare,
        consentAccurate,
        signatureName,
        attachedDocumentIds: [
          ...new Set([...sharedDocIds, ...draft.attachedDocumentIds]),
        ],
      };
      return computeDestinationPrep(
        r,
        merged,
        selected,
        data.documents,
        data.seniorCreated ? data.senior : null,
        data.careNeeds,
        Boolean(hasActiveSubmission(data.applications, r.id)),
      );
    }).filter(Boolean) as ReturnType<typeof computeDestinationPrep>[];
  }, [
    selected,
    drafts,
    desiredMoveIn,
    consentShare,
    consentAccurate,
    signatureName,
    sharedDocIds,
    data.documents,
    data.senior,
    data.seniorCreated,
    data.careNeeds,
    data.applications,
  ]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MULTI_APPLY_MAX) return prev;
      return [...prev, id];
    });
  };

  const patchDraft = (residenceId: string, partial: Partial<FamilyApplication>) => {
    setDrafts((prev) => ({
      ...prev,
      [residenceId]: { ...prev[residenceId], ...partial },
    }));
  };

  const toggleSharedDoc = (docId: string) => {
    setSharedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  const toggleSpecificDoc = (residenceId: string, docId: string) => {
    const draft = drafts[residenceId];
    if (!draft) return;
    const has = draft.attachedDocumentIds.includes(docId);
    patchDraft(residenceId, {
      attachedDocumentIds: has
        ? draft.attachedDocumentIds.filter((id) => id !== docId)
        : [...draft.attachedDocumentIds, docId],
    });
  };

  const current = MULTI_APPLY_STEPS[step];
  const canSend =
    consentShare &&
    consentAccurate &&
    signatureName.trim().length >= 2 &&
    preps.some((p) => p.prepStatus === "ready" || p.prepStatus === "needs_info");

  const onSend = () => {
    if (!canSend || sending) return;
    setSending(true);
    const payloads = preps
      .filter((p) => p.prepStatus === "ready" || p.prepStatus === "needs_info")
      .map((p) => ({
        ...p.draft,
        desiredMoveIn,
        consentShare,
        consentAccurate,
        signatureName,
        submittedByName: user?.name || signatureName,
        submittedByEmail: user?.email || "",
        attachedDocumentIds: [
          ...new Set([...sharedDocIds, ...p.draft.attachedDocumentIds]),
        ],
        familyAccess: [user?.name || "Primary account"].filter(Boolean),
      }));
    if (!payloads.length) {
      setSending(false);
      return;
    }
    const results = submitApplicationBatch(payloads);
    setSentApps(results);
    setStep(MULTI_APPLY_STEPS.length - 1);
    setSending(false);
  };

  const seniorName = seniorDisplayName(data.senior) || data.person.name || "your loved one";

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Multi-community apply
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Apply to several communities
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            One profile for {seniorName} — up to {MULTI_APPLY_MAX} independent applications.
            Each community only sees what you attach to them.
          </p>
        </div>
        <Button href="/family/applications" variant="secondary" size="sm">
          Tracking view
        </Button>
      </div>

      {current.id !== "done" && (
        <>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{
                width: `${((step + 1) / (MULTI_APPLY_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {MULTI_APPLY_STEPS.slice(0, -1).map((s, i) => (
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
        {/* SELECT */}
        {current.id === "select" && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Select up to {MULTI_APPLY_MAX} communities</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {selectedIds.length}/{MULTI_APPLY_MAX} selected · Prefer compatible, partner
                listings when possible.
              </p>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              {residences.map((r) => {
                const on = selectedIds.includes(r.id);
                const sent = hasActiveSubmission(data.applications, r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={Boolean(sent) || (!on && selectedIds.length >= MULTI_APPLY_MAX)}
                    onClick={() => toggleSelect(r.id)}
                    className={cn(
                      "flex gap-3 rounded-xl border p-3 text-left transition",
                      on ? "border-brand bg-brand-soft/40" : "border-line hover:border-line-strong",
                      sent && "opacity-50",
                    )}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                      <Image src={r.image} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                    <span className="min-w-0">
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {r.city}, {r.state} · {r.careLevels[0]}
                        {sent ? " · Already applied" : ""}
                      </span>
                    </span>
                    {on && <Check className="ml-auto shrink-0 text-brand" size={18} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* COMMON */}
        {current.id === "common" && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Shared requirements</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Asked by all {selected.length} selected communities. Attach shared documents once —
                they can still be removed per destination later.
              </p>
            </header>

            <label className="block">
              <span className="text-sm font-medium">Desired move-in (shared)</span>
              <input
                value={desiredMoveIn}
                onChange={(e) => setDesiredMoveIn(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="e.g. Within 30 days"
              />
            </label>

            <div>
              <p className="text-sm font-semibold">Common document asks</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                {(commonDocs.length
                  ? commonDocs
                  : [
                      "Government-issued ID",
                      "Insurance / Medicare / Medicaid cards",
                      "Recent physician summary",
                      "Medication list",
                    ]
                ).map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-brand-soft/40 px-3 py-2.5 text-sm">
              <Lock size={16} className="mt-0.5 shrink-0 text-brand" />
              Shared selection does not auto-open your whole vault — only checked files are attached.
            </div>

            {data.documents.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No vault files yet.{" "}
                <Link href="/family/documents" className="font-medium text-brand">
                  Upload documents
                </Link>{" "}
                then return here.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.documents.map((doc) => {
                  const on = sharedDocIds.includes(doc.id);
                  return (
                    <li key={doc.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5",
                          on ? "border-brand bg-brand-soft/30" : "border-line",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-[var(--brand)]"
                          checked={on}
                          onChange={() => toggleSharedDoc(doc.id)}
                        />
                        <span>
                          <span className="font-medium">{doc.name}</span>
                          <span className="block text-xs text-ink-muted">
                            {categoryLabel(doc.category)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* PREPARE per community */}
        {current.id === "prepare" && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Specific requirements</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Complete each destination independently — answers and extra docs stay private to that
                community.
              </p>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {selected.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setFocusId(r.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                    focusId === r.id
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-line text-ink-muted",
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>

            {focusId && drafts[focusId] && getResidence(focusId) && (
              <DestinationEditor
                residence={getResidence(focusId)!}
                draft={drafts[focusId]}
                allSelected={selected}
                vault={data.documents}
                sharedDocIds={sharedDocIds}
                onPatch={(p) => patchDraft(focusId, p)}
                onToggleDoc={(docId) => toggleSpecificDoc(focusId, docId)}
              />
            )}
          </div>
        )}

        {/* BOARD */}
        {current.id === "board" && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Readiness board</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Completeness, remaining questions, and incompatibilities per destination.
              </p>
            </header>
            <div className="space-y-3">
              {preps.map((p) => (
                <div
                  key={p.residence.id}
                  className="rounded-xl border border-line px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.residence.name}</p>
                      <p className="text-xs text-ink-muted">
                        Match {p.matchScore}% · {prepStatusLabel(p.prepStatus)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        p.prepStatus === "ready"
                          ? "success"
                          : p.prepStatus === "blocked"
                            ? "danger"
                            : p.prepStatus === "already_sent"
                              ? "neutral"
                              : "warn"
                      }
                    >
                      {p.completeness}% ready
                    </Badge>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${p.completeness}%` }}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-ink">Shared docs · </span>
                      {p.commonDocIds.length} attached
                    </p>
                    <p>
                      <span className="font-medium text-ink">Specific · </span>
                      {p.specificDocLabels.slice(0, 2).join(", ") || "None flagged"}
                    </p>
                    <p>
                      <span className="font-medium text-ink">Questions left · </span>
                      {p.remainingQuestions.length
                        ? p.remainingQuestions.slice(0, 2).join("; ")
                        : "None"}
                    </p>
                    <p className={p.incompatibilities.length ? "text-warn" : undefined}>
                      <span className="font-medium text-ink">Fit notes · </span>
                      {p.incompatibilities[0] || "No major flags"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUMMARIES */}
        {current.id === "summaries" && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Separate summary per destination</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Each packet is independent. Communities never see each other&apos;s materials or
                decisions.
              </p>
            </header>
            {preps.map((p) => {
              const docs = data.documents.filter((d) =>
                [...sharedDocIds, ...p.draft.attachedDocumentIds].includes(d.id),
              );
              return (
                <Card key={p.residence.id} className="border border-line p-4 shadow-none">
                  <div className="flex gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                      <Image
                        src={p.residence.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{p.residence.name}</p>
                      <p className="text-xs text-ink-muted">
                        Independent application · {docs.length} document
                        {docs.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-faint">Timeline</dt>
                      <dd>{desiredMoveIn || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-faint">Documents</dt>
                      <dd className="max-w-[60%] text-right">
                        {docs.map((d) => d.name).join(", ") || "None"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-faint">Answers</dt>
                      <dd>
                        {
                          Object.values(p.draft.specificAnswers).filter(Boolean).length
                        }{" "}
                        completed
                      </dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>
        )}

        {/* CONFIRM */}
        {current.id === "confirm" && (
          <div className="space-y-5">
            <header>
              <h2 className="text-lg font-semibold">Confirm & send</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Submits {preps.filter((p) => p.prepStatus !== "already_sent").length} independent
                applications. Double-sends to the same community are blocked.
              </p>
            </header>

            <div className="rounded-xl border border-line bg-bg px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Layers size={16} /> Privacy between communities
              </p>
              <p className="mt-1 text-ink-muted">
                Accept, decline, waitlist, tour, assessment, or placement decisions stay private to
                each application. One community never sees another&apos;s response.
              </p>
            </div>

            <label className="flex gap-3 rounded-xl border border-line px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--brand)]"
                checked={consentShare}
                onChange={(e) => setConsentShare(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Consent to share</span>
                <span className="mt-0.5 block text-ink-muted">
                  I may share {seniorName}&apos;s profile and the selected documents with each listed
                  community for admissions review.
                </span>
              </span>
            </label>
            <label className="flex gap-3 rounded-xl border border-line px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--brand)]"
                checked={consentAccurate}
                onChange={(e) => setConsentAccurate(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Accuracy</span>
                <span className="mt-0.5 block text-ink-muted">
                  Information is true and complete to the best of my knowledge.
                </span>
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Electronic signature</span>
              <input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 font-serif text-lg italic outline-none focus:border-brand"
                placeholder="Full legal name"
              />
            </label>
          </div>
        )}

        {/* DONE */}
        {current.id === "done" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-success" size={40} />
            <h2 className="mt-4 text-2xl font-semibold">Applications sent</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-muted">
              {sentApps.length} independent application{sentApps.length === 1 ? "" : "s"} created.
              Track each community&apos;s private response in Applications.
            </p>
            <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
              {sentApps.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm"
                >
                  <span className="font-medium">{a.residenceName}</span>
                  <Badge tone="accent">Submitted</Badge>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Button href="/family/applications">Open tracking view</Button>
              <Button href="/family/dashboard" variant="secondary">
                Dashboard
              </Button>
            </div>
          </div>
        )}

        {current.id !== "done" && (
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            {current.id === "confirm" ? (
              <Button
                type="button"
                disabled={!canSend || sending || selected.length === 0}
                onClick={onSend}
              >
                {sending ? "Sending…" : `Send ${selected.length} application${selected.length === 1 ? "" : "s"}`}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={current.id === "select" && selected.length === 0}
                onClick={() => setStep((s) => Math.min(MULTI_APPLY_STEPS.length - 2, s + 1))}
              >
                Continue
              </Button>
            )}
          </div>
        )}
      </Card>

      {current.id === "select" && selected.length === 0 && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          Tip: start from{" "}
          <button
            type="button"
            className="text-brand underline"
            onClick={() =>
              router.push(
                `/family/apply-multi?ids=${data.compareIds.slice(0, 5).join(",") || data.savedFavorites
                  .slice(0, 3)
                  .map((f) => f.communityId)
                  .join(",")}`,
              )
            }
          >
            compare or saved lists
          </button>
          .
        </p>
      )}
    </div>
  );
}

function DestinationEditor({
  residence,
  draft,
  allSelected,
  vault,
  sharedDocIds,
  onPatch,
  onToggleDoc,
}: {
  residence: NonNullable<ReturnType<typeof getResidence>>;
  draft: FamilyApplication;
  allSelected: NonNullable<ReturnType<typeof getResidence>>[];
  vault: { id: string; name: string; category: string }[];
  sharedDocIds: string[];
  onPatch: (p: Partial<FamilyApplication>) => void;
  onToggleDoc: (docId: string) => void;
}) {
  const specific = specificRequirements(residence, allSelected);
  const questions = communityQuestions(residence.id);

  return (
    <div className="space-y-4 rounded-xl border border-line p-4">
      <div>
        <h3 className="font-semibold">{residence.name}</h3>
        <p className="text-xs text-ink-muted">
          Specific forms & questions · not shared with other destinations
        </p>
      </div>

      {(specific.documents.length > 0 || specific.forms.length > 0) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Specific asks
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
            {[...specific.documents, ...specific.forms].map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
        </div>
      )}

      {specific.notAccepted.length > 0 && (
        <div className="rounded-lg bg-warn-soft/40 px-3 py-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-warn">
            <AlertTriangle size={12} /> Often not accepted
          </span>
          <p className="mt-1">{specific.notAccepted[0]}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Extra documents for this community
        </p>
        <ul className="mt-2 space-y-1.5">
          {vault.map((doc) => {
            const shared = sharedDocIds.includes(doc.id);
            const on = draft.attachedDocumentIds.includes(doc.id) || shared;
            return (
              <li key={doc.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-[var(--brand)]"
                    checked={on}
                    disabled={shared}
                    onChange={() => onToggleDoc(doc.id)}
                  />
                  <span>
                    {doc.name}
                    {shared ? (
                      <span className="text-xs text-ink-faint"> (shared)</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Questions for {residence.name}
        </p>
        {questions.map((q) => (
          <label key={q.id} className="block text-sm">
            <span className="font-medium">
              {q.label}
              {q.required ? " *" : ""}
            </span>
            {q.type === "textarea" ? (
              <textarea
                rows={2}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
                value={draft.specificAnswers[q.id] || ""}
                onChange={(e) =>
                  onPatch({
                    specificAnswers: { ...draft.specificAnswers, [q.id]: e.target.value },
                  })
                }
              />
            ) : q.type === "select" ? (
              <select
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
                value={draft.specificAnswers[q.id] || ""}
                onChange={(e) =>
                  onPatch({
                    specificAnswers: { ...draft.specificAnswers, [q.id]: e.target.value },
                  })
                }
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
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
                value={draft.specificAnswers[q.id] || ""}
                onChange={(e) =>
                  onPatch({
                    specificAnswers: { ...draft.specificAnswers, [q.id]: e.target.value },
                  })
                }
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function MultiApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading multi-apply…
        </div>
      }
    >
      <MultiApplyInner />
    </Suspense>
  );
}
