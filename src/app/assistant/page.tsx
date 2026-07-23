"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AssistantShell } from "@/components/assistant/AssistantShell";
import { Composer } from "@/components/assistant/Composer";
import { MessageList } from "@/components/assistant/MessageList";
import { SummaryCard } from "@/components/assistant/SummaryCard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import {
  type AssistantPhase,
  type ChatMessage,
  buildSummaryFields,
  processTurn,
  progressFromState,
  resumePhase,
  welcomeMessage,
} from "@/lib/assistant/conversation-engine";
import { parseSearchIntent } from "@/lib/assistant/search-intent";
import { dossierReadyForApply, missingRequiredApplyDocs } from "@/lib/family-applications";
import { useFamilyData } from "@/lib/family-data";
import { seniorDisplayName } from "@/lib/senior-profile";

type Mode = "setup" | "search" | "apply";

function modeFromParam(raw: string | null): Mode {
  if (raw === "search" || raw === "apply") return raw;
  return "setup";
}

function ApplyHandoff({
  seniorName,
  ready,
  missing,
}: {
  seniorName: string;
  ready: boolean;
  missing: string[];
}) {
  return (
    <div className="mb-4 rounded-3xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <FileText size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Prepare applications</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {ready
              ? `The dossier for ${seniorName} looks ready to send. Pick communities, then review before you submit.`
              : `Before applying for ${seniorName}, finish the items below so communities receive a complete packet.`}
          </p>
          {!ready && missing.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-secondary">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {ready ? (
              <>
                <Button href="/find-senior-living" size="sm">
                  <Search size={14} /> Find communities
                </Button>
                <Button href="/family/find-communities" size="sm" variant="secondary">
                  Browse list
                </Button>
              </>
            ) : (
              <>
                <Button href="/family/documents" size="sm">
                  Open documents
                </Button>
                <Button href="/family/care-needs" size="sm" variant="secondary">
                  Care needs
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = modeFromParam(params.get("mode"));
  const { completeOnboarding } = useAuth();
  const {
    data,
    completeness,
    updateSeniorDraft,
    updateCareNeeds,
    setOnboardingStep,
    finalizeSeniorProfile,
    markCareNeedsComplete,
  } = useFamilyData();

  const [phase, setPhase] = useState<AssistantPhase>(() =>
    mode === "setup" ? resumePhase(data.senior, data.careNeeds) : "done",
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (mode === "search") {
      return [
        {
          id: "search-welcome",
          role: "assistant",
          text: "Tell me what you're looking for—city, miles, budget, or care type—and I'll open search with those filters.",
          suggestions: [
            "Within 20 miles of Boston under $7,000",
            "Memory care near Austin",
            "Assisted living available now",
          ],
        },
      ];
    }
    if (mode === "apply") {
      return [
        {
          id: "apply-welcome",
          role: "assistant",
          text: "I can check whether the dossier is ready to apply, then send you to communities or the document vault.",
          suggestions: ["Is my dossier ready?", "Find communities", "Open documents"],
        },
      ];
    }
    return [welcomeMessage()];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const progress = progressFromState(data.senior, data.careNeeds, phase);
  const summaryFields = useMemo(() => buildSummaryFields(data.senior), [data.senior]);
  const seniorName = seniorDisplayName(data.senior) || "your loved one";

  const applyReadiness = useMemo(
    () =>
      dossierReadyForApply({
        seniorCreated: data.seniorCreated,
        completeness,
        careNeedsCompleted: Boolean(data.careNeeds.completedAt),
        documents: data.documents,
      }),
    [data.seniorCreated, data.careNeeds.completedAt, data.documents, completeness],
  );
  const missingDocLabels = missingRequiredApplyDocs(data.documents).map((d) => d.label);

  const applyResult = (result: ReturnType<typeof processTurn>) => {
    if (result.seniorPatch) updateSeniorDraft(result.seniorPatch);
    if (result.carePatch) updateCareNeeds(result.carePatch);
    if (result.setOnboardingStep != null) setOnboardingStep(result.setOnboardingStep);
    if (result.finalize) {
      finalizeSeniorProfile();
      completeOnboarding();
    }
    if (result.markCareComplete) markCareNeedsComplete();
    setPhase(result.phase);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: result.reply,
        suggestions: result.suggestions,
      },
    ]);
    return result;
  };

  const goSearch = (text: string) => {
    const filters = parseSearchIntent(text);
    const qs = new URLSearchParams();
    if (filters.query) qs.set("q", filters.query);
    if (filters.maxMiles) qs.set("miles", String(filters.maxMiles));
    if (filters.budgetMax) qs.set("budget", String(filters.budgetMax));
    if (filters.careTypes[0]) qs.set("care", filters.careTypes[0]);
    router.push(`/find-senior-living?${qs.toString()}`);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);

    window.setTimeout(() => {
      const n = text.toLowerCase();

      if (mode === "apply" || n.includes("dossier") || n.includes("ready to apply") || n.includes("application")) {
        if (n.includes("document")) {
          setBusy(false);
          router.push("/family/documents");
          return;
        }
        if (n.includes("find") || n.includes("communit")) {
          setBusy(false);
          router.push("/find-senior-living");
          return;
        }
        if (n.includes("ready") || n.includes("dossier") || mode === "apply") {
          const missing = [
            ...applyReadiness.reasons,
            ...missingDocLabels.map((l) => `Upload: ${l}`),
          ];
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: applyReadiness.ok
                ? `Yes—${seniorName}'s dossier looks ready. Browse communities, then use Apply to review and send.`
                : `Not quite yet. ${missing.slice(0, 4).join(" ")}`,
              suggestions: applyReadiness.ok
                ? ["Find communities", "Go to my dashboard"]
                : ["Open documents", "Continue setup"],
            },
          ]);
          setBusy(false);
          return;
        }
      }

      if (
        mode === "search" ||
        phase === "done" ||
        n.includes("find communities") ||
        n.includes("under $") ||
        (n.includes("mile") && (n.includes("near") || n.includes("within")))
      ) {
        if (n.includes("dashboard")) {
          setBusy(false);
          router.push("/family/dashboard");
          return;
        }
        if (n.includes("document")) {
          setBusy(false);
          router.push("/family/documents");
          return;
        }
        if (n.includes("apply") && !n.includes("application status")) {
          setBusy(false);
          router.push("/assistant?mode=apply");
          return;
        }
        if (
          mode === "search" ||
          phase === "done" ||
          n.includes("find") ||
          n.includes("mile") ||
          n.includes("under") ||
          n.includes("near")
        ) {
          setBusy(false);
          goSearch(text);
          return;
        }
      }

      const result = applyResult(processTurn(phase, text, data.senior));
      setBusy(false);
      if (result.handoffSearch && (n.includes("find") || n.includes("search"))) {
        goSearch(text);
      }
    }, 380);
  };

  const latestSuggestions =
    [...messages].reverse().find((m) => m.role === "assistant" && m.suggestions?.length)
      ?.suggestions || [];

  const showSummary = mode === "setup" && phase === "summary";
  const title =
    mode === "search" ? "Search with Haven" : mode === "apply" ? "Apply with Haven" : "Haven assistant";

  return (
    <AssistantShell
      title={title}
      progress={progress}
      sidebar={
        <div className="rounded-2xl border border-line/80 bg-surface/80 p-4 text-xs leading-relaxed text-ink-muted">
          Classic forms stay available anytime for edits.
          <Link href="/family/senior-profile" className="mt-2 block font-medium text-brand hover:underline">
            Edit senior profile
          </Link>
          <Link href="/family/care-needs" className="mt-1 block font-medium text-brand hover:underline">
            Edit care needs
          </Link>
        </div>
      }
    >
      {mode === "apply" ? (
        <ApplyHandoff
          seniorName={seniorName}
          ready={applyReadiness.ok}
          missing={[...applyReadiness.reasons, ...missingDocLabels]}
        />
      ) : null}

      <MessageList messages={messages} busy={busy} />

      {showSummary ? (
        <div className="mb-4">
          <SummaryCard
            title={`Review ${seniorName}'s profile`}
            fields={summaryFields}
            confirming={busy}
            onConfirm={() => send("Looks good, confirm profile")}
            onEdit={(hint) => send(hint)}
          />
        </div>
      ) : null}

      {phase === "done" && mode === "setup" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button href="/find-senior-living" size="sm">
            Find communities
          </Button>
          <Button href="/assistant?mode=apply" size="sm" variant="secondary">
            Prepare to apply
          </Button>
          <Button href="/family/dashboard" size="sm" variant="ghost">
            Dashboard
          </Button>
        </div>
      ) : null}

      <Composer
        value={input}
        onChange={setInput}
        onSend={send}
        suggestions={latestSuggestions}
        busy={busy}
        placeholder={
          mode === "search"
            ? 'e.g. "within 20 miles of Boston under $7,000"'
            : mode === "apply"
              ? "Ask about readiness, documents, or search…"
              : "Type your answer…"
        }
      />
    </AssistantShell>
  );
}

export default function AssistantPage() {
  return (
    <RequireAuth role="family">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
            Loading…
          </div>
        }
      >
        <AssistantInner />
      </Suspense>
    </RequireAuth>
  );
}
