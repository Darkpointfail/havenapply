"use client";

import { FormEvent, useState } from "react";
import {
  FileSearch,
  MapPin,
  MessageSquareText,
  Sparkles,
  X,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAi } from "@/lib/ai";
import { cn } from "@/lib/utils";

const suggestions = [
  "Which communities match Mom’s memory-care needs?",
  "Estimate monthly cost near Montreal",
  "What’s missing from our documents?",
  "Draft a message to Maple Grove",
  "Explain assisted living vs memory care",
];

const replies: Record<string, string> = {
  default:
    "I’ve reviewed Margaret’s profile. Based on mobility, mild cognitive changes, and a $4–5.5k budget within 25 km, Maple Grove and Cedar Memory Care are strong matches. Want me to compare them side by side or draft applications?",
};

export function AiAssistant() {
  const { open, setOpen, prompt, setPrompt } = useAi();
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: "I’m Haven AI — I can compare communities, estimate costs, check missing documents, and guide applications. What do you need?",
    },
  ]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "ai", text: replies.default },
    ]);
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
          "fixed bottom-5 right-5 z-[60] flex h-14 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-lg",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Open Haven AI"
      >
        <Sparkles size={18} className="text-brand-strong" />
        Ask Haven AI
      </button>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-line bg-surface shadow-lift transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ai-soft text-ai">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-semibold">Haven AI</p>
              <p className="text-xs text-ink-muted">Admission co-pilot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-brand text-white"
                    : "rounded-bl-md bg-bg-soft text-ink",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}

          {messages.length < 3 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Try asking
              </p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex w-full items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink-secondary transition hover:border-line-strong hover:bg-bg-soft"
                >
                  {s.includes("document") ? (
                    <FileSearch size={14} className="mt-0.5 shrink-0 text-brand" />
                  ) : s.includes("message") ? (
                    <MessageSquareText size={14} className="mt-0.5 shrink-0 text-brand" />
                  ) : (
                    <MapPin size={14} className="mt-0.5 shrink-0 text-brand" />
                  )}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg-soft p-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Ask anything about admissions…"
              className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <Button type="submit" size="icon" aria-label="Send">
              <ArrowUp size={16} />
            </Button>
          </div>
        </form>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[65] bg-ink/20 backdrop-blur-[2px]"
          aria-label="Close AI overlay"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
