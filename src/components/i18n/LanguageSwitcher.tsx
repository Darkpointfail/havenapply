"use client";

import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** Icon-sized control for dense headers */
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "relative z-20 inline-flex shrink-0 items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-1 text-[15px] font-semibold",
        className,
      )}
      role="group"
      aria-label={t("Language")}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLocale(code);
          }}
          className={cn(
            "rounded-[10px] transition-colors",
            compact ? "min-h-10 min-w-10 px-2.5" : "min-h-11 min-w-11 px-3",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-strong)] focus-visible:ring-offset-2",
            locale === code
              ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
              : "text-[var(--ink-secondary)] hover:text-[var(--ink)]",
          )}
          aria-pressed={locale === code}
          aria-label={code === "en" ? t("Switch to English") : t("Switch to French")}
          title={code === "en" ? t("English") : t("French")}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
