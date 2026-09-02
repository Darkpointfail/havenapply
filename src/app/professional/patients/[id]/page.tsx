"use client";

import { Suspense } from "react";
import { PatientWorkspace } from "@/components/professional/PatientWorkspace";

export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <PatientWorkspace />
    </Suspense>
  );
}
