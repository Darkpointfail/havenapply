"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useAi } from "@/lib/ai";
import { answerCopilot } from "@/lib/assistant/copilot-intents";
import { useFamilyData } from "@/lib/family-data";
import { seniorDisplayName } from "@/lib/senior-profile";
import { cn } from "@/lib/utils";

export function AiAssistant() {
  const { open, setOpen, prompt, setPrompt } = useAi();
  const { data, completeness } = useFamilyData();
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; href?: string }[]>([
    {
      role: "ai",
      text: "I'm Haven. Ask me about applications, missing documents, or say “continue setup” to keep building the profile.",
    },
  ]);

  useEffect(() => {
    if (open && prompt.trim()) {
      const q = prompt.trim();
      setPrompt("");
      // Defer so panel is open
      window.setTimeout(() => send(q), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const reply = answerCopilot({
      question: q,
      applications: data.applications,
      documents: data.documents,
      seniorName: seniorDisplayName(data.senior) || data.person.name || "your loved one",
      seniorCreated: data.seniorCreated,
      completeness,
      careNeedsCompleted: Boolean(data.careNeeds.completedAt),
    });
    setMessages((m) => [...m, { role: "user", text: q }, { role: "ai", text: reply.text, href: reply.href }]);
    setPrompt("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(prompt);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-14 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Open Haven AI"
      >
        <Sparkles size={18} className="text-brand" />
        Ask Haven
      </button>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-line bg-surface shadow-lift transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-semibold">Haven</p>
              <p className="text-xs text-ink-muted">Admission co-pilot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-ink text-white" : "bg-bg-soft text-ink",
                )}
              >
                {m.text}
                {m.role === "ai" && m.href && (
                  <button
                    type="button"
                    className="mt-2 block text-xs font-semibold text-brand hover:underline"
                    onClick={() => {
                      setOpen(false);
                      router.push(m.href!);
                    }}
                  >
                    Open →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {["Where is my application?", "What document am I missing?", "Continue setup"].map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted hover:border-brand/30"
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Haven…"
              className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"
              aria-label="Send"
            >
              <ArrowUp size={16} />
            </button>
          </form>
          <Link
            href="/assistant"
            className="mt-2 block text-center text-xs font-medium text-brand"
            onClick={() => setOpen(false)}
          >
            Open full assistant
          </Link>
        </div>
      </div>
    </>
  );
}
