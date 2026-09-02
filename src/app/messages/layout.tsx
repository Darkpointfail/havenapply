"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="family">{children}</RequireAuth>;
}
