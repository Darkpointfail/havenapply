"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-on-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-deep)]";

export function BenefitsSplit() {
  const t = useT();

  return (
    <section className="bg-[var(--ink-deep)] px-5 py-20 text-white md:px-16 md:py-24">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <h2 className="home-h2 text-white">{t("home.benefits.title")}</h2>
        </Reveal>
        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <div>
              <h3 className="home-h3 text-[var(--brand-on-dark)]">
                {t("home.benefits.families.title")}
              </h3>
              <ul className="mt-6 space-y-4">
                {(
                  [
                    "home.benefits.families.1",
                    "home.benefits.families.2",
                    "home.benefits.families.3",
                  ] as const
                ).map((key) => (
                  <li key={key} className="flex gap-3 text-[18px] leading-[1.6] text-white/88">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-pale)]" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <div>
              <h3 className="home-h3 text-[var(--brand-on-dark)]">
                {t("home.benefits.residences.title")}
              </h3>
              <ul className="mt-6 space-y-4">
                {(
                  [
                    "home.benefits.residences.1",
                    "home.benefits.residences.2",
                    "home.benefits.residences.3",
                  ] as const
                ).map((key) => (
                  <li key={key} className="flex gap-3 text-[18px] leading-[1.6] text-white/88">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-pale)]" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className={cn(
                "inline-flex h-14 w-full items-center justify-center rounded-[14px] bg-white px-6 text-[17px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-soft)] sm:w-auto",
                focusRing,
              )}
            >
              {t("home.benefits.ctaFamily")}
            </Link>
            <Link
              href="/contact"
              className={cn(
                "inline-flex h-14 w-full items-center justify-center rounded-[14px] border-[1.5px] border-white px-6 text-[17px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto",
                focusRing,
              )}
            >
              {t("home.benefits.ctaResidence")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
