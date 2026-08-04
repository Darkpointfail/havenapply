"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Layers, Sparkles } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import { useT } from "@/lib/i18n/locale";

function StartChoiceInner() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, ready: familyReady } = useFamilyData();
  const t = useT();

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

  const welcome = user.firstName
    ? t("Welcome, {name}", { name: user.firstName })
    : t("Welcome");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
          {welcome}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {t("Create the shared resident dossier")}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          {t(
            "Fill once for yourself or a loved one. Upload documents, collaborate with family, and send the same packet to several communities.",
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/family/dossier"
          className="group flex flex-col rounded-[1.5rem] border border-brand/25 bg-gradient-to-b from-brand-soft/60 to-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
            <Layers size={20} />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            {t("Build the resident dossier")}
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
            {t(
              "A calm 9-step wizard. Fill once in about 15 minutes, then send the same dossier to several communities.",
            )}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">
            {t("Start the dossier")}
            <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </Link>

        <Link
          href="/assistant"
          className="group flex flex-col rounded-[1.5rem] border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-soft text-ink">
            <Sparkles size={20} />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{t("Chat with Haven")}</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
            {t(
              "Haven asks natural questions and fills the dossier for you. Administrative help only — no clinical decisions.",
            )}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
            {t("Start with AI")}
            <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        <Button
          href="/family/dashboard"
          variant="ghost"
          size="sm"
          className="inline h-auto p-0 text-brand"
        >
          {t("Skip to dashboard")}
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
