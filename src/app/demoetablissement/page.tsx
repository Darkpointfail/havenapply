"use client";

/**
 * Temporary no-login shortcut into the establishment console for the 2026-09-09
 * demo. Signs in (or silently creates) a fixed demo facility account, then
 * redirects into the real /community/dashboard. Delete this route after the
 * demo — it exists purely as a fallback if the normal sign-in path has an
 * issue during the meeting.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const DEMO_EMAIL = "demo.etablissement@havenapply.local";
const DEMO_PASSWORD = "DemoEtablissement2026!";

export default function DemoEtablissementPage() {
  const router = useRouter();
  const { signIn, signUp, ready: authReady } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!authReady || started.current) return;
    started.current = true;

    (async () => {
      const signedIn = await signIn({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        expectedRole: "facility",
      });
      if (signedIn.ok) {
        router.replace("/community/dashboard");
        return;
      }

      const signedUp = await signUp({
        role: "facility",
        firstName: "Démo",
        lastName: "Établissement",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        acceptedTerms: true,
        organization: "Maple Grove Residence",
        jobTitle: "Direction des admissions",
      });
      if (signedUp.ok) {
        router.replace("/community/dashboard");
        return;
      }

      setError(signedUp.error || "Impossible d'ouvrir l'espace établissement.");
    })();
  }, [authReady, signIn, signUp, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        <p className="mt-4 text-sm text-ink-muted">
          {error ?? "Ouverture de l'espace établissement…"}
        </p>
      </div>
    </div>
  );
}
