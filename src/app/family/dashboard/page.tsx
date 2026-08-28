"use client";

import { Suspense } from "react";
import { FamilySpace } from "@/components/family-space/FamilySpace";

/** B2C entry: family portal home is the new espace famille UI. */
export default function FamilyDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-full bg-brand-soft" />
        </div>
      }
    >
      <FamilySpace />
    </Suspense>
  );
}
