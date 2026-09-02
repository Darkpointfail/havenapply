"use client";

import { FamilyMembersHub } from "@/components/family/FamilyMembersHub";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function FamilyMembersPage() {
  return (
    <RequireAuth role="family">
      <FamilyMembersHub />
    </RequireAuth>
  );
}
