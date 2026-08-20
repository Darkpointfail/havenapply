"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-on-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-deep)]";

const linkClass = cn(
  "text-[16px] text-white/75 transition-colors hover:text-white",
  focusRing,
  "rounded-[6px]",
);

export function HomeFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--ink-deep)] px-5 py-16 text-white md:px-16 md:py-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-10 md:grid-cols-4 md:gap-8">
          <div>
            <p className="text-[22px] font-semibold tracking-tight">
              <span className="text-white">Haven</span>
              <span className="text-[var(--brand-on-dark)]">Apply</span>
            </p>
            <p className="mt-4 max-w-xs text-[16px] leading-[1.5] text-white/75">
              {t("home.footer.tagline")}
            </p>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">{t("home.footer.families")}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/get-started" className={linkClass}>
                  {t("home.footer.families.start")}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className={linkClass}>
                  {t("home.footer.families.how")}
                </Link>
              </li>
              <li>
                <Link href="/find-senior-living" className={linkClass}>
                  {t("home.footer.families.find")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">{t("home.footer.orgs")}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/for-communities" className={linkClass}>
                  {t("home.footer.orgs.residences")}
                </Link>
              </li>
              <li>
                <Link href="/get-started" className={linkClass}>
                  {t("home.footer.orgs.pros")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  {t("home.footer.orgs.demo")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">{t("home.footer.brand")}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="#confidentialite" className={linkClass}>
                  {t("home.footer.brand.security")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  {t("home.footer.brand.contact")}
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className={linkClass}>
                  {t("home.footer.brand.signIn")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[16px] text-white/60">
            {t("home.footer.copyright", { year })}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/contact" className={linkClass}>
                {t("home.footer.legal.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {t("home.footer.legal.terms")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {t("home.footer.legal.a11y")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
