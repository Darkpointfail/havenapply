import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  hover = false,
  padding = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm",
        hover &&
          "transition-all duration-300 ease-out hover:border-line-strong hover:shadow-card",
        padding && "p-5 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
