"use client";

import { Check } from "lucide-react";
import type { ProgressItem } from "@/lib/assistant/conversation-engine";
import { cn } from "@/lib/utils";

export function ProgressRail({
  items,
  className,
  compact = false,
}: {
  items: ProgressItem[];
  className?: string;
  /** Mobile: horizontal pills */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)} aria-label="Progress">
        {items.map((p) => (
          <span
            key={p.id}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
              p.done ? "bg-brand-soft text-brand-strong" : "bg-bg-soft text-ink-faint",
            )}
          >
            {p.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <aside className={cn("space-y-1", className)} aria-label="Profile progress">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        Progress
      </p>
      <ol className="space-y-1">
        {items.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition",
              p.done ? "text-ink" : "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                p.done ? "bg-brand text-white" : "bg-bg-soft text-ink-faint",
              )}
            >
              {p.done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn(p.done && "font-medium")}>{p.label}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
