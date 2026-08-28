"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import "@/components/marketing/public-home.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

function StartChoiceInner() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, ready: familyReady } = useFamilyData();

  const profileReady = Boolean(user?.onboardingCompleted && data.seniorCreated);

  useEffect(() => {
    if (!ready || !familyReady || !user) return;
    if (profileReady) {
      router.replace("/family/dashboard");
    }
  }, [ready, familyReady, user, profileReady, router]);

  if (!ready || !familyReady || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--hp-wash,#f1f7f5)]">
        <div
          className="h-10 w-10 animate-pulse rounded-full"
          style={{ background: "#d6efe9" }}
          aria-hidden
        />
      </div>
    );
  }

  if (profileReady) return null;

  const welcome = user.firstName ? `Bonjour ${user.firstName}` : "Bienvenue";

  return (
    <div
      className={`hp min-h-[100dvh] ${sourceSerif.variable} ${publicSans.variable}`}
      style={{ background: "var(--hp-wash)" }}
    >
      <header className="border-b border-[var(--hp-border)] bg-white">
        <div className="hp-wrap flex h-[58px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[14px] font-semibold text-white"
              style={{ background: "var(--hp-green)" }}
              aria-hidden
            >
              H
            </span>
            <span className="hp-serif text-[19px] text-[var(--hp-ink)]">HavenApply</span>
          </Link>
          <Link href="/family/dashboard" className="hp-btn-ghost text-[14px]">
            Passer à l&apos;espace famille
          </Link>
        </div>
      </header>

      <main className="hp-wrap flex flex-col justify-center py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-[12.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--hp-ink-muted)" }}
          >
            {welcome}
          </p>
          <h1 className="hp-serif mt-3 text-[34px] leading-tight text-[var(--hp-ink)] md:text-[40px]">
            Comment souhaitez-vous créer le profil d&apos;admission ?
          </h1>
          <p className="hp-body mx-auto mt-4 max-w-xl">
            Pour vous ou pour un proche. Vous le constituez une seule fois, puis vous l&apos;envoyez
            aux résidences choisies.
          </p>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Link
            href="/family/dashboard"
            className="hp-card flex flex-col p-7 text-left no-underline transition-colors hover:bg-[var(--hp-green-tint)]"
          >
            <p
              className="text-[12.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--hp-green-deep)" }}
            >
              Recommandé
            </p>
            <h2 className="hp-serif mt-3 text-[22px] text-[var(--hp-ink)]">
              Avec Claire, votre accompagnatrice
            </h2>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[var(--hp-ink-body)]">
              Elle pose les questions, remplit le dossier avec vous, et signale ce qui manque.
              Idéal si vous préférez une conversation guidée.
            </p>
            <span className="mt-8 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-[var(--hp-green)]">
              Commencer avec Claire →
            </span>
          </Link>

          <Link
            href="/onboarding"
            className="hp-card flex flex-col p-7 text-left no-underline transition-colors hover:bg-[var(--hp-wash)]"
          >
            <p
              className="text-[12.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--hp-ink-muted)" }}
            >
              Manuel
            </p>
            <h2 className="hp-serif mt-3 text-[22px] text-[var(--hp-ink)]">
              Remplir le formulaire soi-même
            </h2>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[var(--hp-ink-body)]">
              Étapes structurées si vous avez déjà les renseignements et souhaitez contrôler chaque
              champ.
            </p>
            <span className="mt-8 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-[var(--hp-ink)]">
              Ouvrir le formulaire →
            </span>
          </Link>
        </div>

        <p className="mt-10 text-center text-[14px] text-[var(--hp-ink-muted)]">
          Vous pourrez changer de méthode en tout temps.{" "}
          <Link href="/family/dashboard" className="font-semibold text-[var(--hp-green)] no-underline">
            Aller à l&apos;espace famille
          </Link>
        </p>
      </main>
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
