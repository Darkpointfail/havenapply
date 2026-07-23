"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SummaryField } from "@/lib/assistant/conversation-engine";

export function SummaryCard({
  title,
  fields,
  onConfirm,
  onEdit,
  confirming,
}: {
  title: string;
  fields: SummaryField[];
  onConfirm: () => void;
  onEdit: (hint: string) => void;
  confirming?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Review what we’ll save, then confirm—or edit any field.
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-3">
        {fields.map((f) => (
          <div
            key={f.id}
            className="flex items-start justify-between gap-3 rounded-2xl bg-bg-soft/70 px-3.5 py-3"
          >
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                {f.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink">{f.value}</dd>
            </div>
            <button
              type="button"
              onClick={() => onEdit(f.editHint)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>
        ))}
      </dl>

      <Button
        type="button"
        className="mt-5 w-full"
        size="lg"
        disabled={confirming}
        onClick={onConfirm}
      >
        {confirming ? "Saving…" : "Confirm profile"}
      </Button>
    </div>
  );
}
