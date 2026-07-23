"use client";

import { Sparkles } from "lucide-react";
import { ProgressRail } from "@/components/assistant/ProgressRail";
import type { ProgressItem } from "@/lib/assistant/conversation-engine";
import { cn } from "@/lib/utils";

export function AssistantShell({
  title = "Haven assistant",
  subtitle,
  progress,
  children,
  sidebar,
  className,
}: {
  title?: string;
  subtitle?: string;
  progress: ProgressItem[];
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}) {
  const doneCount = progress.filter((p) => p.done).length;

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_at_top,_var(--brand-soft)_0%,_var(--bg)_55%)]",
        className,
      )}
    >
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:px-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10">
        <div className="flex min-h-[70vh] flex-col">
          <header className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="text-xs text-ink-muted">
                {subtitle || `${doneCount}/${progress.length} sections ready`}
              </p>
            </div>
          </header>

          <div className="mb-4 lg:hidden">
            <ProgressRail items={progress} compact />
          </div>

          {children}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <ProgressRail items={progress} />
            {sidebar}
          </div>
        </div>
      </div>
    </div>
  );
}
