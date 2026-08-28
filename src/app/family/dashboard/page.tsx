"use client";

import { FamilySpace } from "@/components/family-space/FamilySpace";
import { RequireAuth } from "@/components/auth/RequireAuth";

/** B2C entry: family portal home is the new espace famille UI. */
export default function FamilyDashboardPage() {
  return (
    <RequireAuth role="family">
      <FamilySpace />
    </RequireAuth>
  );
}
