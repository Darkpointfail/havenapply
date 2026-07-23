"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ClipboardList, Sparkles } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";

function StartChoiceInner() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, ready: familyReady } = useFamilyData();

  // Only leave this page when the loved-one profile is actually created.
  // Account flag alone is not enough (open-access demo can mark onboarding done early).
  const profileReady = Boolean(user?.onboardingCompleted && data.seniorCreated);

  useEffect(() => {
    if (!ready || !familyReady || !user) return;
    if (profileReady) {
      router.replace("/family/dashboard");
    }
  }, [ready, familyReady, user, profileReady, router]);

  if (!ready || !familyReady || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  if (profileReady) return null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
          Welcome{user.firstName ? `, ${user.firstName}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          How would you like to create the profile?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          For yourself or a loved one. Build it once, then discover communities and apply everywhere
          with almost no extra work.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/assistant"
          className="group flex flex-col rounded-[1.5rem] border border-brand/25 bg-gradient-to-b from-brand-soft/60 to-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
            <Sparkles size={20} />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">Chat with Haven</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
            Haven asks natural questions and fills the profile for you. Best if you prefer a guided conversation.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">
            Start with AI
            <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </Link>

        <Link
          href="/onboarding"
          className="group flex flex-col rounded-[1.5rem] border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-soft text-ink">
            <ClipboardList size={20} />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">Fill forms yourself</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
            Step-by-step forms if you already know the details and want full control over every field.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
            Use manual forms
            <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        You can switch methods anytime.{" "}
        <Button href="/family/dashboard" variant="ghost" size="sm" className="inline h-auto p-0 text-brand">
          Skip to dashboard
        </Button>
      </p>
    </div>
  );
}

export default function StartPage() {
  return (
    <RequireAuth role="family">
      <StartChoiceInner />
    </RequireAuth>
  );
}
