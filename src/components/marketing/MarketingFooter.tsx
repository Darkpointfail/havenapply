"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { publicAuthLinks } from "@/config/navigation";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-on-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-deep)]";

const linkClass = cn(
  "text-[16px] text-white/75 transition-colors hover:text-white",
  focusRing,
  "rounded-[6px]",
);

export function MarketingFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[var(--ink-deep)] px-5 py-16 text-white md:px-16 md:py-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-10 md:grid-cols-4 md:gap-8">
          <div>
            <Logo light className="!ml-0 !translate-y-0" />
            <p className="mt-4 max-w-xs text-[16px] leading-[1.5] text-white/75">
              {t("Senior living admissions, made clear.")}
            </p>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">{t("For Families")}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/get-started" className={linkClass}>
                  {t("Get started")}
                </Link>
              </li>
              <li>
                <Link href="/#comment" className={linkClass}>
                  {t("How it works")}
                </Link>
              </li>
              <li>
                <Link href="/find-senior-living" className={linkClass}>
                  {t("Find Senior Living")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">{t("For Residences")}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/get-started" className={linkClass}>
                  {t("For Residences")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  {t("Request a demo")}
                </Link>
              </li>
              <li>
                <Link href="/get-started" className={linkClass}>
                  {t("Community sign-in")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">HavenApply</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/contact" className={linkClass}>
                  {t("Contact")}
                </Link>
              </li>
              <li>
                <Link href={publicAuthLinks.signIn} className={linkClass}>
                  {t("Log in")}
                </Link>
              </li>
              <li>
                <Link href="/internal/sign-in" className={linkClass}>
                  {t("Internal admin")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[16px] text-white/60">© {year} HavenApply</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/contact" className={linkClass}>
                {t("Privacy")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {t("Security")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {t("Accessibility")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** @deprecated use MarketingFooter */
export { MarketingFooter as HomeFooter };
