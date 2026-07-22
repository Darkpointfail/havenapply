"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FileWarning,
  MapPin,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { residences } from "@/data/residences";
import { statusLabel, statusTone } from "@/data/applications";
import { useAi } from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import { computeCompatibility } from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import { dossierReadyForApply, toDisplayApplication } from "@/lib/family-applications";
import { useMessaging } from "@/lib/messaging-store";
import {
  type SeniorProfile,
} from "@/lib/senior-profile";
import { cn } from "@/lib/utils";

/** Kinship phrase for the welcome message, without repeating the name. */
function lovedOnePhrase(senior: SeniorProfile): string {
  const rel = (senior.relationship || "").toLowerCase();
  const gender = (senior.gender || "").toLowerCase();
  const isFemale =
    gender === "female" ||
    gender === "woman" ||
    gender === "f" ||
    gender.includes("femme");
  const isMale =
    gender === "male" ||
    gender === "man" ||
    gender === "m" ||
    gender.includes("homme");

  if (rel.includes("self") || rel.includes("senior")) {
    return "your profile";
  }
  if (rel.includes("mother") || rel === "mom") return "your mother";
  if (rel.includes("father") || rel === "dad") return "your father";
  if (rel === "daughter" || rel === "son") {
    if (isFemale) return "your mother";
    if (isMale) return "your father";
    return "your parent";
  }
  if (rel.includes("spouse") || rel.includes("partner")) {
    if (isFemale) return "your wife";
    if (isMale) return "your husband";
    return "your partner";
  }
  if (rel.includes("grandchild") || rel.includes("grandmother") || rel.includes("grandfather")) {
    if (rel.includes("grandmother") || isFemale) return "your grandmother";
    if (rel.includes("grandfather") || isMale) return "your grandfather";
    return "your grandparent";
  }
  if (rel.includes("sibling") || rel.includes("sister") || rel.includes("brother")) {
    if (rel.includes("sister") || isFemale) return "your sister";
    if (rel.includes("brother") || isMale) return "your brother";
    return "your sibling";
  }
  if (rel.includes("aunt") || rel.includes("uncle") || rel.includes("niece") || rel.includes("nephew")) {
    if (rel.includes("aunt") || isFemale) return "your aunt";
    if (rel.includes("uncle") || isMale) return "your uncle";
    return "your loved one";
  }
  if (rel.includes("friend")) return "your friend";
  if (rel.includes("caregiver") || rel.includes("professional")) {
    return "the person you support";
  }
  return "your loved one";
}

type JourneyStep = {
  id: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
  minutes: number;
};

export default function FamilyDashboardPage() {
  const { user } = useAuth();
  const { ask } = useAi();
  const { data, completeness, toggleSavedCommunity } = useFamilyData();
  const { visibleThreads } = useMessaging();

  const senior = data.senior;
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";
  const careDone = Boolean(data.careNeeds.completedAt);
  const lovedOne = lovedOnePhrase(senior);
  const needsSetup = !data.seniorCreated || !user?.onboardingCompleted;
  const greeting = firstName ? `Hi ${firstName}` : "Hi";
  const dossierComplete = dossierReadyForApply({
    seniorCreated: data.seniorCreated,
    completeness,
    careNeedsCompleted: careDone,
    documents: data.documents,
  }).ok;

  const activeApps = useMemo(
    () =>
      data.applications
        .filter((a) => !["declined", "withdrawn", "closed", "draft"].includes(a.status))
        .map(toDisplayApplication),
    [data.applications],
  );

  const steps: JourneyStep[] = useMemo(() => {
    const profileDone = data.seniorCreated && completeness >= 70;
    const docsDone = data.documents.length > 0;
    const discovered = data.savedFavorites.length > 0 || activeApps.length > 0;
    const applied = activeApps.length > 0;

    return [
      {
        id: "profile",
        title: needsSetup
          ? `Create a profile for ${lovedOne}`
          : `Complete the profile for ${lovedOne}`,
        detail: needsSetup
          ? "A few questions so Haven understands the situation and care needs."
          : careDone
            ? "Add the last details for more accurate applications."
            : "Fill in care needs to better match communities.",
        href: needsSetup ? "/start" : "/family/profile",
        done: profileDone && careDone,
        minutes: needsSetup ? 15 : 8,
      },
      {
        id: "docs",
        title: "Upload essential documents",
        detail: "Insurance card, ID, and more, once, for every application.",
        href: "/family/profile?tab=documents",
        done: docsDone,
        minutes: 5,
      },
      {
        id: "discover",
        title: "Browse matching communities",
        detail: `Suggestions based on the profile for ${lovedOne}.`,
        href: "/family/find-communities",
        done: discovered,
        minutes: 10,
      },
      {
        id: "apply",
        title: "Apply from a community profile",
        detail: "Open a profile, send the dossier, then track your applications.",
        href: "/family/find-communities",
        done: applied,
        minutes: 2,
      },
    ];
  }, [
    data.seniorCreated,
    completeness,
    data.documents.length,
    data.savedFavorites.length,
    activeApps.length,
    needsSetup,
    lovedOne,
    careDone,
  ]);

  const remaining = steps.filter((s) => !s.done);
  const next = remaining[0] || steps[steps.length - 1];
  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);
  const journeyComplete = remaining.length === 0;

  const needsActionApps = activeApps.filter(
    (a) =>
      a.status === "more_info" ||
      a.missingDocuments.length > 0 ||
      a.requestedDocuments.length > 0 ||
      a.unreadMessages > 0,
  );

  const underReview = activeApps.filter((a) =>
    ["submitted", "received", "under_review", "assessment_requested", "tour_requested"].includes(
      a.status,
    ),
  );
  const decided = activeApps.filter((a) =>
    ["approved", "conditionally_approved", "offer_received", "waitlisted"].includes(a.status),
  );

  const recentMessages = visibleThreads
    .filter((t) => !t.archivedByFamily)
    .slice(0, 3);

  const recommended = useMemo(() => {
    const appliedIds = new Set(activeApps.map((a) => a.residenceId));
    return residences
      .filter((r) => !appliedIds.has(r.id))
      .map((r) => ({
        residence: r,
        match: computeCompatibility(
          r,
          data.seniorCreated ? senior : null,
          careDone ? data.careNeeds : null,
        ),
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3);
  }, [senior, data.seniorCreated, data.careNeeds, careDone, activeApps]);

  const savedIds = useMemo(
    () => new Set(data.savedFavorites.map((f) => f.communityId)),
    [data.savedFavorites],
  );

  /* ─── Tracking mode (journey complete) ─── */
  if (journeyComplete) {
    const actionHeadline =
      needsActionApps.length > 0
        ? needsActionApps.length === 1
          ? `An application for ${lovedOne} needs your response`
          : `${needsActionApps.length} applications for ${lovedOne} need your attention`
        : underReview.length > 0
          ? `Tracking applications for ${lovedOne}`
          : decided.length > 0
            ? `Updates for ${lovedOne}`
            : `Here’s where applications for ${lovedOne} stand`;

    const actionSub =
      needsActionApps.length > 0
        ? "A document, message, or missing detail, respond to move the dossier forward."
        : underReview.length > 0
          ? "Communities are reviewing the dossier. You’ll be notified when there’s news."
          : "Check each application’s status or apply to more communities.";

    return (
      <div className="min-h-full">
        <div className="mx-auto max-w-[920px] space-y-10 px-5 py-8 md:px-8 md:py-12">
          <header>
            <p className="text-base text-ink-muted">{greeting},</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-[2.35rem] md:leading-tight">
              {actionHeadline}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              {actionSub}
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Needs you",
                value: needsActionApps.length,
                hint: "Action on your side",
                href: "/family/applications",
                tone: needsActionApps.length > 0 ? "warn" : "neutral",
              },
              {
                label: "In review",
                value: underReview.length,
                hint: "With communities",
                href: "/family/applications",
                tone: "brand",
              },
              {
                label: "Decisions",
                value: decided.length,
                hint: "Accepted, offer, waitlist",
                href: "/family/applications",
                tone: "success",
              },
            ].map((m) => (
              <Link key={m.label} href={m.href}>
                <Card className="h-full p-4 transition hover:border-brand/30">
                  <p className="text-2xl font-semibold tabular-nums">{m.value}</p>
                  <p className="mt-0.5 text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-ink-faint">{m.hint}</p>
                </Card>
              </Link>
            ))}
          </div>

          {needsActionApps.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Do this now
              </h2>
              <div className="mt-4 space-y-2">
                {needsActionApps.map((app) => {
                  const docs =
                    app.requestedDocuments[0] ||
                    app.missingDocuments[0] ||
                    null;
                  return (
                    <Link
                      key={app.id}
                      href={`/family/applications/${app.id}`}
                      className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft/30 p-4 transition hover:border-warn/50"
                    >
                      <FileWarning size={18} className="mt-0.5 shrink-0 text-warn" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{app.residenceName}</p>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {docs
                            ? `Document requested: ${docs}`
                            : app.unreadMessages > 0
                              ? `${app.unreadMessages} unread message${app.unreadMessages > 1 ? "s" : ""}`
                              : app.nextAction || "More information is requested"}
                        </p>
                      </div>
                      <Badge tone="warn">{statusLabel(app.status)}</Badge>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Applications
                </h2>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  {activeApps.length} for {lovedOne}
                </p>
              </div>
              <Link
                href="/family/applications"
                className="text-sm font-medium text-brand hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {activeApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/family/applications/${app.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:border-brand/25"
                >
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl">
                    <Image src={app.image} alt="" fill className="object-cover" sizes="72px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{app.residenceName}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
                      {app.nextAction || `Updated ${app.lastUpdated}`}
                      {app.upcomingAppointment ? ` · Visit ${app.upcomingAppointment}` : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Messages
              </h2>
              <Link
                href="/family/messages"
                className="text-sm font-medium text-brand hover:underline"
              >
                Inbox
              </Link>
            </div>
            {recentMessages.length === 0 ? (
              <Card className="p-5 text-sm text-ink-muted">
                Conversations with communities will show up here.
              </Card>
            ) : (
              <div className="space-y-2">
                {recentMessages.map((t) => {
                  const last = t.messages[t.messages.length - 1];
                  const unread = t.messages.some(
                    (m) => m.fromRole === "community" && !m.readByFamily,
                  );
                  return (
                    <Link
                      key={t.id}
                      href={`/family/messages?community=${t.residenceId}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/25"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{t.residenceName}</p>
                        <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                          {last?.text || "No messages"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {unread && <span className="h-2 w-2 rounded-full bg-brand" />}
                        <span className="text-[10px] text-ink-faint">{last?.time}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {recommended.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Keep going
                  </h2>
                  <p className="mt-1 text-lg font-semibold tracking-tight">
                    More communities for {lovedOne}
                  </p>
                </div>
                <Link
                  href="/family/find-communities"
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Browse
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {recommended.map(({ residence: r, match }) => {
                  const saved = savedIds.has(r.id);
                  return (
                    <Card key={r.id} className="overflow-hidden p-0" hover>
                      <div className="relative h-28">
                        <Image src={r.image} alt="" fill className="object-cover" sizes="280px" />
                        <span className="absolute left-2 top-2 rounded-full bg-surface/95 px-2 py-0.5 text-xs font-semibold">
                          {match.score}%
                        </span>
                      </div>
                      <div className="space-y-2 p-3.5">
                        <h3 className="text-sm font-semibold leading-snug">{r.name}</h3>
                        <div className="flex gap-2">
                          <Button href={`/find-senior-living/${r.id}`} size="sm" className="flex-1">
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleSavedCommunity(r.id)}
                          >
                            <Bookmark
                              size={14}
                              className={saved ? "fill-current text-brand" : ""}
                            />
                          </Button>
                          <Button
                            href={`/family/apply/${r.id}`}
                            size="sm"
                            variant="soft"
                          >
                            <Send size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <Card className="flex flex-wrap items-center justify-between gap-4 border-brand/20 bg-gradient-to-r from-brand-soft/50 to-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                <Sparkles size={16} />
              </span>
              <div>
                <p className="font-semibold">Question about an application?</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Haven can explain a status or the next step.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                ask(
                  needsActionApps.length > 0
                    ? `What should I do for the application for ${lovedOne} that needs more information?`
                    : `Where do applications for ${lovedOne} stand?`,
                )
              }
            >
              Ask Haven
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  /* ─── Journey mode (not finished yet) ─── */
  const profileIncomplete = !steps[0].done;
  const headline = profileIncomplete
    ? remaining.length <= 1
      ? `One more step for ${lovedOne}`
      : `A few steps to finish the profile for ${lovedOne}`
    : dossierComplete
      ? `The profile for ${lovedOne} is ready, explore communities`
      : `Keep building the dossier for ${lovedOne}`;

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[920px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-base text-ink-muted">{greeting},</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-[2.35rem] md:leading-tight">
            {headline}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            {profileIncomplete
              ? "One profile, then you can find communities and apply everywhere without starting over."
              : dossierComplete
                ? "Browse suggestions, compare, then send the dossier in a few clicks."
                : "Finish the required documents and care details before we suggest communities."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button href={next.href} size="lg">
              {next.title.includes("Create") ? "Get started" : "Continue"}
              <ArrowRight size={16} />
            </Button>
            <div className="flex items-center gap-3 text-sm text-ink-muted">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg-soft sm:w-36">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="tabular-nums">
                {doneCount}/{steps.length} steps
              </span>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Your journey
          </h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => {
              const isNext = step.id === next.id && !step.done;
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className={cn(
                      "flex gap-4 rounded-2xl border p-4 transition md:p-5",
                      isNext
                        ? "border-brand/35 bg-brand-soft/40 shadow-xs"
                        : step.done
                          ? "border-line/70 bg-surface opacity-80"
                          : "border-line bg-surface hover:border-brand/25",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        step.done
                          ? "bg-success text-white"
                          : isNext
                            ? "bg-brand text-white"
                            : "bg-bg-soft text-ink-muted",
                      )}
                    >
                      {step.done ? <CheckCircle2 size={16} /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("font-semibold", step.done && "text-ink-muted")}>
                          {step.title}
                        </p>
                        {isNext && <Badge tone="brand">Do this now</Badge>}
                        {step.done && (
                          <span className="text-xs font-medium text-success">Done</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
                      <p className="mt-2 text-xs text-ink-faint">~{step.minutes} min</p>
                    </div>
                    <ArrowRight
                      size={18}
                      className={cn(
                        "mt-2 shrink-0",
                        isNext ? "text-brand" : "text-ink-faint",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {dossierComplete && (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Suggestions
                  </h2>
                  <p className="mt-1 text-lg font-semibold tracking-tight">
                    Communities for {lovedOne}
                  </p>
                </div>
                <Link
                  href="/family/find-communities"
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Browse all
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {recommended.map(({ residence: r, match }) => {
                  const saved = savedIds.has(r.id);
                  return (
                    <Card key={r.id} className="overflow-hidden p-0" hover>
                      <div className="relative h-36">
                        <Image src={r.image} alt="" fill className="object-cover" sizes="300px" />
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold shadow-xs">
                          {match.score}% match
                        </span>
                      </div>
                      <div className="space-y-2.5 p-4">
                        <h3 className="font-semibold leading-snug">{r.name}</h3>
                        <p className="text-xs text-ink-muted">
                          <MapPin size={11} className="mr-1 inline" />
                          {r.distanceMiles} mi · {r.careLevels[0]}
                        </p>
                        <div className="flex gap-2">
                          <Button href={`/find-senior-living/${r.id}`} size="sm" className="flex-1">
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleSavedCommunity(r.id)}
                            aria-label={saved ? "Unsave" : "Save"}
                          >
                            <Bookmark size={14} className={saved ? "fill-current text-brand" : ""} />
                          </Button>
                          <Button
                            href={`/family/apply/${r.id}`}
                            size="sm"
                            variant="soft"
                            aria-label="Apply"
                          >
                            <Send size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {activeApps.length === 0 && (
                <Card className="mt-4 p-5">
                  <p className="text-sm text-ink-muted">
                    Ready to apply? Open a community and send the dossier from its profile.
                  </p>
                  <Button href="/family/find-communities" size="sm" className="mt-3">
                    <Search size={14} /> Browse communities
                  </Button>
                </Card>
              )}
            </section>

            <Card className="flex flex-wrap items-center justify-between gap-4 border-brand/20 bg-gradient-to-r from-brand-soft/50 to-surface p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="font-semibold">Need a hand?</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Ask Haven for the next step for {lovedOne}.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  ask(`What communities fit best for ${lovedOne}?`)
                }
              >
                Ask Haven
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
