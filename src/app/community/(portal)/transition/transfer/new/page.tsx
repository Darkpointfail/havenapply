"use client";

import { Suspense } from "react";
import { NewPatientTransferPage } from "@/components/community/transfer/NewPatientTransferPage";
import { useT } from "@/lib/i18n/locale";

function Fallback() {
  const t = useT();
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
      {t("Opening transfer…")}
    </div>
  );
}

export default function NewTransferRoutePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <NewPatientTransferPage />
    </Suspense>
  );
}
