"use client";

import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";

const items = [
  { q: "home.concerns.1.q", a: "home.concerns.1.a" },
  { q: "home.concerns.2.q", a: "home.concerns.2.a" },
  { q: "home.concerns.3.q", a: "home.concerns.3.a" },
  { q: "home.concerns.4.q", a: "home.concerns.4.a" },
] as const;

export function ConcernsGrid() {
  const t = useT();

  return (
    <section className="bg-[var(--bg-soft)] px-5 py-20 md:px-16 md:py-24">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <h2 className="home-h2 text-[var(--ink)]">{t("home.concerns.title")}</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <Reveal key={item.q}>
              <article className="h-full rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-8 transition-colors hover:border-[var(--brand-strong)]/25">
                <h3 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.02em] text-[var(--ink)] md:text-[22px]">
                  {t(item.q)}
                </h3>
                <p className="mt-3 text-[18px] leading-[1.6] text-[var(--ink-secondary)]">
                  {t(item.a)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
