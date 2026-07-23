"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSend,
  suggestions = [],
  busy,
  placeholder = "Type your answer…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  suggestions?: string[];
  busy?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-3">
      {suggestions.length > 0 && !busy ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSend(s)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-secondary transition hover:border-brand/40 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={cn(
          "flex items-end gap-2 rounded-[1.25rem] border border-line bg-surface p-2 shadow-sm",
          "focus-within:border-brand/40",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          onSend(value);
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          placeholder={placeholder}
          disabled={busy}
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-ink-faint disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(value);
            }
          }}
        />
        <button
          type="submit"
          disabled={!value.trim() || busy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}
