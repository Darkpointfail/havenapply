"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="professional">{children}</RequireAuth>;
}
