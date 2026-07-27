"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";

/**
 * Legacy form onboarding — conversational intake is the primary path.
 * Bookmarks to /onboarding land on the assistant setup flow.
 */
function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/assistant?mode=setup");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
      Opening Haven assistant…
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth role="family">
      <OnboardingRedirect />
    </RequireAuth>
  );
}
