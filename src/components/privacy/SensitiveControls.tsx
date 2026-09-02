"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SENSITIVE_WARNING } from "@/lib/privacy-security";
import { useT } from "@/lib/i18n/locale";

/** Shared confirm UX for sensitive downloads / destructive actions */
export function confirmSensitiveAction(message: string) {

  const t = useT();  return window.confirm(`${SENSITIVE_WARNING}\n\n${message}`);
}

export function SensitiveDataBanner({ className }: { className?: string }) {
  const t = useT();
  return (
    <Card className={`flex gap-2 border-warn/30 bg-warn-soft/40 p-3 text-sm ${className || ""}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
      <p>
        {t("Sensitive personal or clinical data may appear on this page. Avoid sharing more than")}
        admissions teams need. Formal compliance certifications are not claimed for this demo.
      </p>
    </Card>
  );
}

export function SensitiveDownloadButton({
  label = "Download",
  onConfirm,
}: {
  label?: string;
  onConfirm: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        if (confirmSensitiveAction(`${label} this sensitive file?`)) onConfirm();
      }}
    >
      {label}
    </Button>
  );
}
