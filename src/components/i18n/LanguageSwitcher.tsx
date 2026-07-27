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
        "inline-flex items-center rounded-lg border border-line bg-bg p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label={t("Language")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2 py-1 transition",
          compact ? "min-w-[2rem]" : "px-2.5",
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
        onClick={() => setLocale("fr")}
        className={cn(
          "rounded-md px-2 py-1 transition",
          compact ? "min-w-[2rem]" : "px-2.5",
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
