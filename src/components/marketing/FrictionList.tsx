"use client";

import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";

const items = [
  "home.friction.1",
  "home.friction.2",
  "home.friction.3",
  "home.friction.4",
  "home.friction.5",
] as const;

export function FrictionList() {
  const t = useT();

  return (
    <Reveal>
      <div>
        <h2 className="home-h2 text-[var(--ink)]">{t("home.friction.title")}</h2>
        <ul className="mt-8 space-y-4">
          {items.map((key) => (
            <li key={key} className="flex gap-4">
              <span
                aria-hidden
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#F7E6E3] text-[18px] font-semibold leading-none text-[var(--danger)]"
              >
                ×
              </span>
              <p className="home-body text-[var(--ink)]">{t(key)}</p>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
