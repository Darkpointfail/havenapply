"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher({
  locale,
  className = "",
  compact = false,
}: {
  locale: Locale;
  className?: string;
  compact?: boolean;
}) {
  const other: Locale = locale === "fr" ? "en" : "fr";
  return (
    <div
      className={`relative z-20 inline-flex shrink-0 items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface,#fff)] p-1 text-[15px] font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      {(["fr", "en"] as const).map((code) => (
        <Link
          key={code}
          href={`/${code}`}
          className={[
            "rounded-[10px] transition-colors",
            compact ? "min-h-10 min-w-10 px-2.5" : "min-h-11 min-w-11 px-3",
            "inline-flex items-center justify-center",
            locale === code
              ? "bg-[var(--brand-soft,#e7f6f6)] text-[var(--brand-strong,#0b7373)]"
              : "text-[var(--ink-secondary,#4b5563)] hover:text-[var(--ink,#1a1d23)]",
          ].join(" ")}
          aria-pressed={locale === code}
        >
          {code.toUpperCase()}
        </Link>
      ))}
      <span className="sr-only">{other}</span>
    </div>
  );
}
