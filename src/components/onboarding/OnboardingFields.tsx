"use client";

import { cn } from "@/lib/utils";

export const fieldClass =
  "mt-1.5 w-full rounded-xl border border-line bg-bg-soft px-3 py-2.5 text-ink outline-none transition focus:border-brand";

export function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
        {optional ? <span className="font-normal text-ink-faint"> (optional)</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3.5 text-left transition",
        selected
          ? "border-brand bg-brand-soft shadow-soft"
          : "border-line bg-surface hover:border-brand/40 hover:bg-bg-soft",
      )}
    >
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
    </button>
  );
}

export function MultiChip({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-medium transition",
              on
                ? "bg-brand text-white"
                : "bg-bg-soft text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function YesNoUnsure({
  value,
  onChange,
  labels = { yes: "Yes", no: "No", unsure: "I’m not sure" },
}: {
  value: string;
  onChange: (v: "yes" | "no" | "unsure") => void;
  labels?: { yes: string; no: string; unsure: string };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["yes", "no", "unsure"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3.5 py-2 text-sm font-medium transition",
            value === k
              ? "bg-brand text-white"
              : "bg-bg-soft text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
          )}
        >
          {labels[k]}
        </button>
      ))}
    </div>
  );
}
