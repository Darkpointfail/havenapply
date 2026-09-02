"use client";

import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";

const steps = [
  { n: "1", title: "home.steps.1.title" as const, body: "home.steps.1.body" as const },
  { n: "2", title: "home.steps.2.title" as const, body: "home.steps.2.body" as const },
  { n: "3", title: "home.steps.3.title" as const, body: "home.steps.3.body" as const },
];

export function Steps() {
  const t = useT();

  return (
    <section className="bg-[var(--bg-soft)] px-5 py-20 md:px-16 md:py-24">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <h2 className="home-h2 text-[var(--ink)]">{t("home.steps.title")}</h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <Reveal key={step.n}>
              <li className="flex flex-col">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] text-[17px] font-semibold text-white"
                >
                  {step.n}
                </span>
                <h3 className="mt-5 text-[24px] font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--ink)]">
                  {t(step.title)}
                </h3>
                <p className="mt-3 text-[18px] leading-[1.6] text-[var(--ink-secondary)]">
                  {t(step.body)}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
