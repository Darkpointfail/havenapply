import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?:
    | "neutral"
    | "brand"
    | "success"
    | "warn"
    | "accent"
    | "danger"
    | "ai"
    | "info"
    | "teal"
    | "sage"
    | "amber"
    | "sky"
    | "coral";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-bg-soft text-ink-secondary",
    brand: "bg-brand-soft text-brand-strong",
    teal: "bg-brand-soft text-brand-strong",
    sage: "bg-brand-soft text-brand-strong",
    success: "bg-success-soft text-success",
    warn: "bg-warn-soft text-warn",
    amber: "bg-warn-soft text-warn",
    accent: "bg-accent-soft text-accent",
    coral: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    sky: "bg-info-soft text-info",
    ai: "bg-ai-soft text-ai",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
