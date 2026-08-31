"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Search, Send } from "lucide-react";
import { SectionCard, StepIntro, dossierFieldClass } from "@/components/dossier/DossierFields";
import {
  computeDossierCompleteness,
  trackingLabel,
  type ResidentDossier,
} from "@/lib/resident-dossier";
import { residences, type Residence } from "@/data/residences";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  emptyDraftApplication,
  hasActiveSubmission,
} from "@/lib/family-applications";
import { isResidenceAcceptingApplications } from "@/lib/community-portal";
import { statusTone } from "@/data/applications";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

function matchesSearch(r: Residence, q: string, cities: string, types: string[]) {
  const query = q.trim().toLowerCase();
  const cityBits = cities
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (query) {
    const hay = `${r.name} ${r.city} ${r.state} ${r.region}`.toLowerCase();
    if (!hay.includes(query)) return false;
  } else if (cityBits.length) {
    const loc = `${r.city} ${r.state} ${r.region}`.toLowerCase();
    if (!cityBits.some((c) => loc.includes(c))) return false;
  }

  if (types.length) {
    const map: Record<string, string[]> = {
      independent: ["Independent living"],
      assisted: ["Assisted living"],
      memory: ["Memory care"],
      nursing: ["Nursing care"],
      rehab: ["Rehabilitation"],
      other: [],
    };
    const wanted = types.flatMap((t) => map[t] || []);
    if (wanted.length && !r.careLevels.some((c) => wanted.includes(c))) return false;
  }
  return true;
}

export function StepSubmit({
  value,
  onChange,
  onFinalize,
}: {
  value: ResidentDossier;
  onChange: (patch: Partial<ResidentDossier>) => void;
  onFinalize: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const { data, submitApplicationBatch, saveResidentDossier } = useFamilyData();
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeness = computeDossierCompleteness(value, data.documents);
  const selected = new Set(value.selectedCommunityIds);

  const results = useMemo(() => {
    return residences
      .filter((r) => matchesSearch(r, query, value.preferredCities, value.communityTypes))
      .slice(0, 12);
  }, [query, value.preferredCities, value.communityTypes]);

  const toggle = (id: string) => {
    const next = selected.has(id)
      ? value.selectedCommunityIds.filter((x) => x !== id)
      : [...value.selectedCommunityIds, id];
    onChange({ selectedCommunityIds: next });
  };

  const send = () => {
    if (!user || sending || !value.selectedCommunityIds.length) return;
    if (!value.validatedAt) {
      setError(t("Validate the dossier first (step 7) before sending."));
      return;
    }
    setSending(true);
    setError(null);
    onFinalize();
    saveResidentDossier(value, { finalize: true });

    const drafts = value.selectedCommunityIds
      .map((id) => residences.find((r) => r.id === id))
      .filter(Boolean)
      .filter((r) => !hasActiveSubmission(data.applications, r!.id))
      .filter((r) => isResidenceAcceptingApplications(r!.id))
      .map((r) => {
        const draft = emptyDraftApplication(r!, {
          name: user.name || "",
          email: user.email || "",
        });
        return {
          ...draft,
          attachedDocumentIds: data.documents.map((d) => d.id),
          desiredMoveIn: value.desiredMoveIn,
          consentShare: true,
          consentAccurate: true,
          signatureName: user.name || [value.firstName, value.lastName].filter(Boolean).join(" "),
          specificAnswers: {
            reason: "Shared resident dossier via HavenApply",
            move_timing: value.desiredMoveIn ? "Preferred window" : "Flexible",
            payer: user.name || "Family contact",
          },
        };
      });

    const resultsApps = submitApplicationBatch(drafts);
    setSending(false);
    if (!resultsApps.length) {
      setError(
        t("Nothing new was sent. You may already have active applications at these communities."),
      );
      return;
    }
    setJustSent(true);
    onChange({ selectedCommunityIds: [] });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 8 of 15"
        title="Send to residences"
        subtitle="Select one or more residences. The same validated dossier goes to each."
      />

      <SectionCard className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{t("Profile completeness")}</p>
          <p className="text-2xl font-semibold text-ink">{completeness.percent}%</p>
        </div>
        {!completeness.readyToSubmit || !value.validatedAt ? (
          <p className="max-w-sm text-sm text-amber">
            {!value.validatedAt
              ? t("Validate the dossier on the previous step before sending.")
              : t("You can still send: adding missing items improves response speed.")}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium text-teal-deep">
            <CheckCircle2 size={16} />
            {t("Ready to submit")}
          </p>
        )}
      </SectionCard>

      <div className="relative mb-4">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          className={`${dossierFieldClass} !mt-0 pl-11`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search communities by name or city")}
        />
      </div>

      <div className="space-y-3">
        {results.map((r) => {
          const on = selected.has(r.id);
          const active = hasActiveSubmission(data.applications, r.id);
          const closed = !isResidenceAcceptingApplications(r.id);
          const blocked = Boolean(active || closed);
          return (
            <button
              key={r.id}
              type="button"
              disabled={blocked}
              onClick={() => toggle(r.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-[1.5rem] border p-3 text-left transition sm:p-4",
                blocked
                  ? "cursor-not-allowed border-line bg-bg-soft opacity-70"
                  : on
                    ? "border-brand bg-brand-soft/60 shadow-soft"
                    : "border-line bg-surface hover:border-brand/35",
              )}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-bg-soft">
                <Image src={r.image} alt="" fill className="object-cover" sizes="64px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{r.name}</p>
                <p className="text-sm text-ink-muted">
                  {r.city}, {r.state} · {r.careLevels.slice(0, 2).join(", ")}
                </p>
                {active ? (
                  <p className="mt-1 text-xs font-medium text-brand">
                    {t("Already submitted")}
                  </p>
                ) : null}
                {closed && !active ? (
                  <p className="mt-1 text-xs font-medium text-ink-muted">
                    {t("Not accepting applications")}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  on || active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-transparent",
                )}
              >
                ✓
              </span>
            </button>
          );
        })}
        {!results.length ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            {t("No communities match. Try another city or clear filters.")}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-4 z-10 mt-6 rounded-[1.5rem] border border-line bg-surface/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {value.selectedCommunityIds.length
              ? t("{count} selected: same dossier, one click", {
                  count: String(value.selectedCommunityIds.length),
                })
              : t("Select one or more communities")}
          </p>
          <Button
            type="button"
            disabled={!value.selectedCommunityIds.length || sending}
            onClick={send}
          >
            <Send size={16} />
            {sending ? t("Sending…") : t("Send applications")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        {justSent ? (
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-teal-deep">
            <CheckCircle2 size={16} />
            {t("Applications sent. Track status below.")}
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold tracking-tight text-ink">
          {t("Application tracking")}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {t("Statuses stay private to each community.")}
        </p>

        {data.applications.length === 0 ? (
          <SectionCard className="mt-4">
            <p className="text-sm text-ink-muted">
              {t("Nothing sent yet. Your tracking board will appear here.")}
            </p>
          </SectionCard>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.5rem] border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-bg-soft text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("Community")}</th>
                  <th className="px-4 py-3 font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 font-medium">{t("Updated")}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.applications.map((app) => (
                  <tr key={app.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium text-ink">{app.residenceName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusTone(app.status) === "success" && "bg-teal-soft text-teal-deep",
                          statusTone(app.status) === "warn" && "bg-amber-soft text-amber",
                          statusTone(app.status) === "danger" && "bg-red-100 text-danger",
                          statusTone(app.status) === "accent" && "bg-sky-soft text-sky",
                          statusTone(app.status) === "brand" && "bg-brand-soft text-brand-strong",
                          statusTone(app.status) === "neutral" && "bg-bg-soft text-ink-muted",
                        )}
                      >
                        {t(trackingLabel(app.status))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {app.lastUpdatedLabel || app.submittedDateLabel || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/family/applications/${app.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {t("Open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-muted">
          {[
            "Draft",
            "Submitted",
            "Viewed",
            "Need More Information",
            "Assessment Scheduled",
            "Waitlisted",
            "Accepted",
            "Declined",
            "Move-in Scheduled",
          ].map((s) => (
            <span key={s} className="rounded-full bg-bg-soft px-2.5 py-1">
              {t(s)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
