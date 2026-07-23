"use client";

import { ClipboardList, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProgressItem } from "@/lib/assistant/conversation-engine";

/** Exit / handoff controls while building a profile with the AI. */
export function SetupExitBar({
  remaining,
  saving,
  onSaveAndQuit,
  onSwitchManual,
}: {
  remaining: ProgressItem[];
  saving?: boolean;
  onSaveAndQuit: () => void;
  onSwitchManual: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface/90 p-3.5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Progress is saved as you chat. Leave anytime, or finish the rest in forms.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={onSaveAndQuit}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save & quit"}
          </Button>
          <Button type="button" size="sm" variant="soft" onClick={onSwitchManual}>
            <ClipboardList size={14} />
            Continue in forms
          </Button>
        </div>
      </div>
      {remaining.length > 0 ? (
        <p className="mt-2.5 text-xs text-ink-faint">
          Still open: {remaining.map((r) => r.label).join(" · ")}
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-success">All sections looked at—you can confirm or edit in forms.</p>
      )}
    </div>
  );
}
