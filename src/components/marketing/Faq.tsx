"use client";

import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";

const items = [
  { q: "home.faq.1.q", a: "home.faq.1.a" },
  { q: "home.faq.2.q", a: "home.faq.2.a" },
  { q: "home.faq.3.q", a: "home.faq.3.a" },
  { q: "home.faq.4.q", a: "home.faq.4.a" },
  { q: "home.faq.5.q", a: "home.faq.5.a" },
] as const;

export function Faq() {
  const t = useT();

  return (
    <section className="bg-[var(--surface)] px-5 py-20 md:px-16 md:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-16">
        <Reveal>
          <h2 className="home-h2 text-[var(--ink)]">{t("home.faq.title")}</h2>
        </Reveal>
        <Reveal>
          <div>
            {items.map((item) => (
              <div key={item.q} className="border-t border-[var(--line)] py-7 first:border-t-0 first:pt-0">
                <h3 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.02em] text-[var(--ink)] md:text-[22px]">
                  {t(item.q)}
                </h3>
                <p className="mt-3 text-[18px] leading-[1.6] text-[var(--ink-secondary)]">
                  {t(item.a)}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
