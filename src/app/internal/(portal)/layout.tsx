"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function InternalPortalLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="internal">{children}</RequireAuth>;
}
