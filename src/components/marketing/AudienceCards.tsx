"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-strong)] focus-visible:ring-offset-2";

const cards = [
  {
    badge: "home.audience.family.badge" as const,
    title: "home.audience.family.title" as const,
    body: "home.audience.family.body" as const,
    cta: "home.audience.family.cta" as const,
    href: "/get-started",
    variant: "brand" as const,
  },
  {
    badge: "home.audience.residence.badge" as const,
    title: "home.audience.residence.title" as const,
    body: "home.audience.residence.body" as const,
    cta: "home.audience.residence.cta" as const,
    href: "/contact",
    variant: "ink" as const,
  },
  {
    badge: "home.audience.pro.badge" as const,
    title: "home.audience.pro.title" as const,
    body: "home.audience.pro.body" as const,
    cta: "home.audience.pro.cta" as const,
    href: "/get-started",
    variant: "outline" as const,
  },
];

export function AudienceCards() {
  const t = useT();

  return (
    <section className="bg-[var(--surface)] px-5 py-20 md:px-16 md:py-24">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <h2 className="home-h2 text-[var(--ink)]">{t("home.audience.title")}</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <Reveal key={card.title}>
              <article
                className={cn(
                  "flex h-full flex-col rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-8 transition-colors hover:border-[var(--brand-strong)]/25",
                )}
              >
                <span className="inline-flex w-fit rounded-[10px] bg-[var(--brand-soft)] px-3 py-1.5 text-[16px] font-semibold text-[var(--brand-strong)]">
                  {t(card.badge)}
                </span>
                <h3 className="home-h3 mt-5 text-[var(--ink)]">{t(card.title)}</h3>
                <p className="home-body mt-3 flex-1 text-[var(--ink-secondary)]">{t(card.body)}</p>
                <Link
                  href={card.href}
                  className={cn(
                    "mt-8 inline-flex h-14 w-full items-center justify-center rounded-[14px] px-5 text-[17px] font-semibold transition-colors",
                    focusRing,
                    card.variant === "brand" &&
                      "bg-[var(--brand-strong)] text-white hover:brightness-95",
                    card.variant === "ink" &&
                      "bg-[var(--ink)] text-white hover:brightness-110",
                    card.variant === "outline" &&
                      "border-[1.5px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--bg-soft)]",
                  )}
                >
                  {t(card.cta)}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
