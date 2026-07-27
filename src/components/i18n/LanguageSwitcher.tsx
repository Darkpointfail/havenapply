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
        "relative z-20 inline-flex shrink-0 items-center rounded-lg border border-line bg-bg p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label={t("Language")}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLocale("en");
        }}
        className={cn(
          "rounded-md px-2 py-1.5 transition",
          compact ? "min-w-[2.25rem]" : "min-w-[2.5rem] px-2.5",
          locale === "en"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={locale === "en"}
        aria-label={t("Switch to English")}
        title={t("English")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLocale("fr");
        }}
        className={cn(
          "rounded-md px-2 py-1.5 transition",
          compact ? "min-w-[2.25rem]" : "min-w-[2.5rem] px-2.5",
          locale === "fr"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={locale === "fr"}
        aria-label={t("Switch to French")}
        title={t("French")}
      >
        FR
      </button>
    </div>
  );
}
