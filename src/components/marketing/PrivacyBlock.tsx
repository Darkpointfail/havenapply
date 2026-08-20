"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-strong)] focus-visible:ring-offset-2";

const guarantees = [
  "home.privacy.1",
  "home.privacy.2",
  "home.privacy.3",
  "home.privacy.4",
] as const;

const proofs = [
  "home.privacy.proof.1",
  "home.privacy.proof.2",
  "home.privacy.proof.3",
  "home.privacy.proof.4",
] as const;

export function PrivacyBlock() {
  const t = useT();

  return (
    <section
      id="confidentialite"
      className="scroll-mt-28 bg-[var(--surface)] px-5 py-20 md:px-16 md:py-24"
    >
      <div className="mx-auto grid max-w-[1320px] gap-12 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div>
            <h2 className="home-h2 text-[var(--ink)]">{t("home.privacy.title")}</h2>
            <ul className="mt-8 space-y-4">
              {guarantees.map((key) => (
                <li key={key} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[16px] font-semibold text-[var(--success)]"
                  >
                    ✓
                  </span>
                  <p className="home-body text-[var(--ink-secondary)]">{t(key)}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className={cn(
                "mt-8 inline-flex min-h-14 items-center text-[17px] font-semibold text-[var(--brand-strong)] underline-offset-4 hover:underline",
                focusRing,
                "rounded-[8px]",
              )}
            >
              {t("home.privacy.link")}
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <aside className="rounded-[20px] border border-dashed border-[var(--line-strong)] bg-[var(--bg-soft)] p-8">
            <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {t("home.privacy.proofTitle")}
            </h3>
            <ul className="mt-6 space-y-3">
              {proofs.map((key) => (
                <li
                  key={key}
                  className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-[16px] leading-[1.5] text-[var(--ink-secondary)]"
                >
                  {t(key)}
                </li>
              ))}
            </ul>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
