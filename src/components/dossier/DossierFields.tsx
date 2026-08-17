"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

export const dossierFieldClass =
  "mt-2 w-full rounded-2xl border border-line bg-bg-soft/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10";

export function DossierField({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {t(label)}
        {required ? <span className="text-danger"> *</span> : null}
        {optional ? (
          <span className="font-normal text-ink-faint"> ({t("optional")})</span>
        ) : null}
      </span>
      {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{t(hint)}</span> : null}
      {children}
    </label>
  );
}

export function SelectCard({
  selected,
  onClick,
  title,
  description,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left transition duration-200",
        selected
          ? "border-brand bg-brand-soft/70 shadow-soft scale-[1.01]"
          : "border-line bg-surface hover:border-brand/35 hover:bg-bg-soft",
        className,
      )}
    >
      <p className="font-medium text-ink">{t(title)}</p>
      {description ? (
        <p className="mt-1 text-sm leading-snug text-ink-muted">{t(description)}</p>
      ) : null}
    </button>
  );
}

export function ChipToggle({
  options,
  selected,
  onToggle,
  multi = true,
}: {
  options: { id: string; label: string }[];
  selected: string | string[];
  onToggle: (id: string) => void;
  multi?: boolean;
}) {
  const t = useT();
  const set = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = set.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm font-medium transition",
              on
                ? "bg-ink text-white shadow-sm"
                : "bg-bg-soft text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
            )}
          >
            {t(opt.label)}
          </button>
        );
      })}
      {!multi ? null : null}
    </div>
  );
}

export function StepIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const t = useT();
  return (
    <div className="mb-8 max-w-xl">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {t(eyebrow)}
        </p>
      ) : null}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-[2rem]">
        {t(title)}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-base leading-relaxed text-ink-muted">{t(subtitle)}</p>
      ) : null}
    </div>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-line/80 bg-surface/90 p-5 shadow-sm md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
