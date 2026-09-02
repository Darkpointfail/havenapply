"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-strong)]";

export function ClosingCta() {
  const t = useT();

  return (
    <section className="bg-[var(--brand-strong)] px-5 py-20 md:px-16 md:py-24">
      <div className="mx-auto max-w-[900px] text-center">
        <Reveal>
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] text-white md:text-[44px]">
            {t("home.closing.title")}
          </h2>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/get-started"
              className={cn(
                "inline-flex h-14 w-full items-center justify-center rounded-[14px] bg-white px-6 text-[17px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-soft)] sm:w-auto",
                focusRing,
              )}
            >
              {t("home.closing.ctaPrimary")}
            </Link>
            <Link
              href="/contact"
              className={cn(
                "inline-flex h-14 w-full items-center justify-center rounded-[14px] border-[1.5px] border-white px-6 text-[17px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto",
                focusRing,
              )}
            >
              {t("home.closing.ctaSecondary")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
