"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { publicAuthLinks, publicNav } from "@/config/navigation";
import { useT } from "@/lib/i18n/locale";

export function Footer() {
  const t = useT();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              {t("Senior living admissions, made clear.")}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("Explore")}</h3>
            <ul className="mt-4 space-y-2.5">
              {publicNav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-muted hover:text-brand">
                    {t(l.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("Get started")}</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href={publicAuthLinks.register} className="text-sm text-ink-muted hover:text-brand">
                  {t("Register")}
                </Link>
              </li>
              <li>
                <Link href={publicAuthLinks.signIn} className="text-sm text-ink-muted hover:text-brand">
                  {t("Log in")}
                </Link>
              </li>
              <li>
                <Link href="/community/sign-in" className="text-sm text-ink-muted hover:text-brand">
                  {t("Community sign-in")}
                </Link>
              </li>
              <li>
                <Link href="/internal/sign-in" className="text-sm text-ink-muted hover:text-brand">
                  {t("Internal admin")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("Trust")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
              <li>{t("Privacy")}</li>
              <li>{t("Security")}</li>
              <li>{t("Accessibility")}</li>
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-line pt-6 text-sm text-ink-faint">
          © {new Date().getFullYear()} HavenApply
        </p>
      </div>
    </footer>
  );
}
