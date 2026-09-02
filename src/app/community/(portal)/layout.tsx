"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function CommunityPortalLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="community">{children}</RequireAuth>;
}
