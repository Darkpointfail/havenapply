"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-on-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-deep)]";

export function Hero() {
  const t = useT();

  return (
    <section className="relative isolate overflow-hidden bg-[var(--ink-deep)] px-5 py-20 md:px-16 md:py-24">
      <div className="home-hero-media" aria-hidden>
        <div className="absolute inset-0 bg-[var(--bg-soft)]" />
        <div className="home-hero-media-zoom">
          <Image
            src="/home/hero.jpg"
            alt=""
            fill
            priority
            quality={92}
            sizes="100vw"
            className="object-cover object-[78%_42%]"
          />
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(100deg, rgba(13,42,41,0.90) 0%, rgba(13,42,41,0.72) 46%, rgba(13,42,41,0.28) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1320px]">
        <p className="home-eyebrow text-[var(--brand-on-dark)]">{t("home.hero.eyebrow")}</p>
        <h1 className="home-h1 mt-5 max-w-[900px] text-white">{t("home.hero.title")}</h1>
        <p className="home-lead mt-6 max-w-[640px] text-white/88">{t("home.hero.lead")}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/get-started"
            className={cn(
              "inline-flex h-[60px] w-full items-center justify-center rounded-[14px] bg-[var(--brand-strong)] px-7 text-[17px] font-semibold text-white transition-colors hover:brightness-95 sm:w-auto",
              focusRing,
            )}
          >
            {t("home.hero.ctaPrimary")}
          </Link>
          <Link
            href="/#comment"
            className={cn(
              "inline-flex h-[60px] w-full items-center justify-center rounded-[14px] border-[1.5px] border-white bg-transparent px-7 text-[17px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto",
              focusRing,
            )}
          >
            {t("home.hero.ctaSecondary")}
          </Link>
        </div>

        <p className="home-small mt-8 text-white/80">{t("home.hero.note")}</p>
      </div>
    </section>
  );
}
