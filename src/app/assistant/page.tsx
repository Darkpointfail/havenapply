"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  type AssistantPhase,
  type ChatMessage,
  processTurn,
  progressFromState,
  resumePhase,
  welcomeMessage,
} from "@/lib/assistant/conversation-engine";
import { parseSearchIntent } from "@/lib/assistant/search-intent";
import { cn } from "@/lib/utils";

function AssistantInner() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const {
    data,
    updateSeniorDraft,
    updateCareNeeds,
    setOnboardingStep,
    finalizeSeniorProfile,
    markCareNeedsComplete,
  } = useFamilyData();

  const [phase, setPhase] = useState<AssistantPhase>(() =>
    resumePhase(data.senior, data.careNeeds),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const progress = progressFromState(data.senior, data.careNeeds, phase);
  const doneCount = progress.filter((p) => p.done).length;

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
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);

    window.setTimeout(() => {
      const n = text.toLowerCase();

      if (phase === "done" || n.includes("find communities") || n.includes("under $") || n.includes("miles")) {
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
        if (
          phase === "done" ||
          n.includes("find") ||
          n.includes("mile") ||
          n.includes("under") ||
          n.includes("near")
        ) {
          const filters = parseSearchIntent(text);
          const params = new URLSearchParams();
          if (filters.query) params.set("q", filters.query);
          if (filters.maxMiles) params.set("miles", String(filters.maxMiles));
          if (filters.budgetMax) params.set("budget", String(filters.budgetMax));
          if (filters.careTypes[0]) params.set("care", filters.careTypes[0]);
          setBusy(false);
          router.push(`/find-senior-living?${params.toString()}`);
          return;
        }
      }

      applyResult(processTurn(phase, text, data.senior));
      setBusy(false);
    }, 400);
  };

  const latestSuggestions =
    [...messages].reverse().find((m) => m.role === "assistant" && m.suggestions?.length)
      ?.suggestions || [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[radial-gradient(ellipse_at_top,_var(--brand-soft)_0%,_var(--bg)_50%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="font-semibold text-ink">Haven assistant</p>
            <p className="text-xs text-ink-muted">
              {doneCount}/{progress.length} sections ready
            </p>
          </div>
        </header>

        {/* Simple progress dots */}
        <div className="mb-6 flex gap-1.5">
          {progress.map((p) => (
            <div
              key={p.id}
              title={p.label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition",
                p.done ? "bg-brand" : "bg-line",
              )}
            />
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[min(100%,34rem)] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-relaxed",
                  m.role === "user"
                    ? "bg-ink text-white"
                    : "bg-surface text-ink shadow-xs ring-1 ring-line/50",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-sm text-ink-faint">Haven is typing…</div>
          )}
          <div ref={bottomRef} />
        </div>

        {latestSuggestions.length > 0 && !busy && (
          <div className="mb-3 flex flex-wrap gap-2">
            {latestSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-secondary hover:border-brand/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-end gap-2 rounded-[1.25rem] border border-line bg-surface p-2 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="Type your answer…"
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-ink-faint"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <RequireAuth role="family">
      <AssistantInner />
    </RequireAuth>
  );
}
