"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getResidence } from "@/data/residences";
import { useAuth } from "@/lib/auth";
import {
  computeCompatibility,
  type MatchReason,
} from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import {
  dossierReadyForApply,
  emptyDraftApplication,
  hasActiveSubmission,
} from "@/lib/family-applications";
import { getCommunityDetail } from "@/lib/residence-detail";
import { labelForId, URGENCY_OPTIONS } from "@/lib/senior-profile";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { useResidenceAcceptingApplications } from "@/lib/use-residence-accepting";

function reasonIcon(tone: MatchReason["tone"]) {
  if (tone === "fit") return <ThumbsUp size={14} className="text-success" />;
  if (tone === "gap") return <ThumbsDown size={14} className="text-danger" />;
  return <TriangleAlert size={14} className="text-warn" />;
}

function reasonTone(tone: MatchReason["tone"]) {
  if (tone === "fit") return "success" as const;
  if (tone === "gap") return "danger" as const;
  return "warn" as const;
}

function aiVerdict(score: number, fits: number, gaps: number): string {
  if (score >= 75 && gaps === 0) {
    return "Strong overall fit. Care, budget, and location signals align well with this dossier.";
  }
  if (score >= 65) {
    return "Good candidate with a few points to confirm. Review the caveats below before you send.";
  }
  if (score >= 50) {
    return "Mixed fit. Some needs match, but important gaps may make this a weaker choice for your client.";
  }
  return "Limited fit based on the current dossier. Consider other communities, or update care needs if something changed.";
}

function ApplyReviewInner({ residenceId }: { residenceId: string }) {
  const t = useT();
  const { user } = useAuth();
  const { ready, data, completeness, submitApplicationBatch } = useFamilyData();
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const residence = getResidence(residenceId);
  const detail = getCommunityDetail(residenceId);

  const readiness = useMemo(
    () =>
      dossierReadyForApply({
        seniorCreated: data.seniorCreated,
        completeness,
        careNeedsCompleted: Boolean(data.careNeeds.completedAt),
        documents: data.documents,
      }),
    [data.seniorCreated, data.careNeeds.completedAt, data.documents, completeness],
  );

  const match = useMemo(
    () =>
      residence
        ? computeCompatibility(
            residence,
            data.seniorCreated ? data.senior : null,
            data.careNeeds.completedAt ? data.careNeeds : null,
          )
        : null,
    [residence, data.senior, data.seniorCreated, data.careNeeds],
  );

  const already = residence
    ? hasActiveSubmission(data.applications, residence.id)
    : false;
  const accepting = useResidenceAcceptingApplications(residenceId);
  const activeApp = data.applications.find(
    (a) =>
      a.residenceId === residenceId &&
      a.status !== "draft" &&
      a.status !== "withdrawn",
  );

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!residence || !detail) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">Community not found</h1>
        <Button href="/family/find-communities" className="mt-6">
          {t("Browse communities")}
        </Button>
      </div>
    );
  }

  if (!accepting && !already && !doneId) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Link
          href={`/find-senior-living/${residenceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to community
        </Link>
        <Card className="mt-6 p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("Not accepting applications")}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t("This community has temporarily closed new applications.")}{" "}
            {residence.name} {t("is not receiving new dossiers right now.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href="/family/find-communities">{t("Browse communities")}</Button>
            <Button href={`/find-senior-living/${residenceId}`} variant="secondary">
              {t("Back")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!readiness.ok) {
    const fixHref = readiness.missingDocs.length
      ? "/family/profile?tab=documents"
      : "/family/profile";
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Link
          href={`/find-senior-living/${residenceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to community
        </Link>
        <Card className="mt-6 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Finish the dossier first</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The apply review for {residence.name}, including the AI fit analysis, is only available
            once the client dossier is complete.
          </p>
          {readiness.reasons.length > 0 && (
            <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-ink-secondary">
              {readiness.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={fixHref}>Complete dossier</Button>
            <Button href={`/find-senior-living/${residenceId}`} variant="secondary">
              {t("Back")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const fits = match?.reasons.filter((r) => r.tone === "fit") ?? [];
  const gaps = match?.reasons.filter((r) => r.tone === "gap") ?? [];
  const partials = match?.reasons.filter((r) => r.tone === "partial") ?? [];
  const verdict = match
    ? aiVerdict(match.score, fits.length, gaps.length)
    : "";

  const submit = () => {
    if (!user || !consent || sending || already || !accepting) return;
    setSending(true);
    setError(null);
    const draft = emptyDraftApplication(residence, {
      name: user.name || "",
      email: user.email || "",
    });
    const results = submitApplicationBatch([
      {
        ...draft,
        attachedDocumentIds: data.documents.map((d) => d.id),
        desiredMoveIn: labelForId(URGENCY_OPTIONS, data.senior.urgency) || "",
        consentShare: true,
        consentAccurate: true,
        signatureName: user.name || "",
      },
    ]);
    setSending(false);
    if (!results.length) {
      setError(
        accepting
          ? "Could not submit. You may already have an active application here."
          : t("This community is not accepting new applications right now."),
      );
      return;
    }
    setDoneId(results[0].id);
  };

  if (doneId || already) {
    const trackHref = doneId
      ? `/family/applications/${doneId}`
      : activeApp
        ? `/family/applications/${activeApp.id}`
        : "/family/applications";
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Application submitted</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {residence.name} has been notified. Track the dossier from My applications.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href={trackHref}>Track application</Button>
          <Button href="/family/find-communities" variant="secondary">
            {t("Browse more")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[920px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        <div>
          <Link
            href={`/find-senior-living/${residenceId}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={14} /> Back to listing
          </Link>
          <p className="mt-4 text-sm font-medium text-ink-muted">Apply</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.1rem]">
            {t("Review before you send")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            {t("Check the community details and Haven’s fit analysis for your client, then submit the")}
            complete dossier.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Community details */}
          <Card className="overflow-hidden p-0">
            <div className="relative h-48 md:h-56">
              <Image
                src={residence.image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 560px"
                priority
              />
            </div>
            <div className="space-y-4 p-5 md:p-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{residence.name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} />
                    {residence.city}, {residence.state}
                  </span>
                  <span>·</span>
                  <span>{residence.distanceMiles} mi</span>
                  <span>·</span>
                  <span>
                    {residence.rating}★ ({residence.reviewCount})
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {residence.careLevels.map((c) => (
                  <Badge key={c} tone="neutral">
                    {c}
                  </Badge>
                ))}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-bg-soft/80 px-3.5 py-3">
                  <dt className="text-xs text-ink-faint">From</dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {residence.priceAvailable && residence.priceFrom != null
                      ? `${formatCurrency(residence.priceFrom)} / mo`
                      : "Price on request"}
                  </dd>
                </div>
                <div className="rounded-xl bg-bg-soft/80 px-3.5 py-3">
                  <dt className="text-xs text-ink-faint">Availability</dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {detail.availabilityDetail.label}
                  </dd>
                </div>
                <div className="rounded-xl bg-bg-soft/80 px-3.5 py-3 sm:col-span-2">
                  <dt className="text-xs text-ink-faint">Address</dt>
                  <dd className="mt-0.5 text-sm">
                    {detail.streetAddress}, {residence.city}, {residence.state} {residence.zip}
                  </dd>
                </div>
              </dl>

              {residence.about ? (
                <p className="line-clamp-4 text-sm leading-relaxed text-ink-secondary">
                  {residence.about}
                </p>
              ) : null}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Amenities
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {residence.amenities.slice(0, 8).map((a) => (
                    <li
                      key={a}
                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-secondary"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <Button href={`/find-senior-living/${residenceId}`} variant="secondary" size="sm">
                {t("Full community profile")}
              </Button>
            </div>
          </Card>

          {/* AI review + send */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-ai/20 bg-gradient-to-b from-ai-soft/40 to-surface p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ai">
                    {t("AI fit review")}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                    {match?.score ?? 0}%
                    <span className="ml-1.5 text-sm font-normal text-ink-muted">match</span>
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{verdict}</p>
              {match?.disclaimer ? (
                <p className="mt-2 text-[11px] leading-snug text-ink-faint">{match.disclaimer}</p>
              ) : null}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">Why it may work</h3>
              {fits.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">No strong positive signals yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {fits.map((r) => (
                    <li key={r.text} className="flex gap-2 text-sm text-ink-secondary">
                      <span className="mt-0.5 shrink-0">{reasonIcon(r.tone)}</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(gaps.length > 0 || partials.length > 0) && (
                <>
                  <h3 className="mt-5 text-sm font-semibold">Watch-outs</h3>
                  <ul className="mt-3 space-y-2">
                    {[...gaps, ...partials].map((r) => (
                      <li key={r.text} className="flex gap-2 text-sm text-ink-secondary">
                        <span className="mt-0.5 shrink-0">{reasonIcon(r.tone)}</span>
                        <span>
                          <Badge tone={reasonTone(r.tone)} className="mr-1.5 align-middle">
                            {r.tone === "gap" ? "Gap" : "Partial"}
                          </Badge>
                          {r.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">Send application</h3>
              <p className="mt-1.5 text-sm text-ink-muted">
                Creates a Submitted application for {residence.name} and notifies their admissions
                team.
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line text-brand"
                />
                <span>
                  I confirm the dossier is accurate and authorize Haven to share it with{" "}
                  {residence.name}.
                </span>
              </label>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <Button
                type="button"
                className="mt-4 w-full"
                disabled={!consent || sending}
                onClick={submit}
              >
                {sending ? "Sending…" : "Send application"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FamilyApplyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const t = useT();  const { id } = use(params);
  return (
    <RequireAuth role="family">
      <ApplyReviewInner residenceId={id} />
    </RequireAuth>
  );
}
