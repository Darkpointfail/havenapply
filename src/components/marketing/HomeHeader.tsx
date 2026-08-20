"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/for-families", key: "home.nav.families" as const },
  { href: "/for-communities", key: "home.nav.residences" as const },
  { href: "/get-started", key: "home.nav.professionals" as const },
  { href: "/how-it-works", key: "home.nav.how" as const },
  { href: "#confidentialite", key: "home.nav.security" as const },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-strong)] focus-visible:ring-offset-2";

export function HomeHeader() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const langSwitch = (
    <div
      className="inline-flex items-center rounded-[14px] border border-[var(--line)] p-1"
      role="group"
      aria-label={t("home.lang.label")}
    >
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "min-h-11 min-w-11 rounded-[10px] px-3 text-[16px] font-semibold transition-colors md:min-h-10",
            focusRing,
            locale === code
              ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
              : "text-[var(--ink-secondary)] hover:text-[var(--ink)]",
          )}
          aria-pressed={locale === code}
        >
          {t(code === "fr" ? "home.lang.fr" : "home.lang.en")}
        </button>
      ))}
    </div>
  );

  const drawer =
    mounted &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[200] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-[var(--ink)]/50 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label={t("home.nav.close")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("home.nav.menu")}
        >
          <div className="flex min-h-16 items-center justify-between border-b border-[var(--line)] px-5">
            <Wordmark />
            <button
              type="button"
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--bg-soft)] text-[var(--ink)]",
                focusRing,
              )}
              aria-label={t("home.nav.close")}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-4 py-5" aria-label={t("home.nav.menu")}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-[14px] px-4 py-3.5 text-[17px] font-medium text-[var(--ink)] hover:bg-[var(--bg-soft)]",
                  focusRing,
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-auto space-y-3 border-t border-[var(--line)] pt-5">
              {langSwitch}
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-[14px] border-[1.5px] border-[var(--line-strong)] text-[17px] font-semibold text-[var(--ink)]",
                  focusRing,
                )}
              >
                {t("home.nav.signIn")}
              </Link>
              <Link
                href="/get-started"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-[14px] bg-[var(--brand-strong)] text-[17px] font-semibold text-white",
                  focusRing,
                )}
              >
                {t("home.nav.start")}
              </Link>
            </div>
          </nav>
        </aside>
      </div>,
      document.body,
    );

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-5 py-3 md:px-16 md:py-4">
        <Wordmark />

        <nav
          className="ml-6 hidden flex-1 items-center gap-1 xl:flex"
          aria-label="Principal"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[14px] px-3 py-2.5 text-[16px] font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]",
                focusRing,
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {langSwitch}
          <Link
            href="/sign-in"
            className={cn(
              "inline-flex h-14 min-w-[7.5rem] items-center justify-center rounded-[14px] px-4 text-[16px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-soft)]",
              focusRing,
            )}
          >
            {t("home.nav.signIn")}
          </Link>
          <Link
            href="/get-started"
            className={cn(
              "inline-flex h-14 items-center justify-center rounded-[14px] bg-[var(--brand-strong)] px-5 text-[16px] font-semibold text-white transition-colors hover:brightness-95",
              focusRing,
            )}
          >
            {t("home.nav.start")}
          </Link>
        </div>

        <button
          type="button"
          className={cn(
            "ml-auto inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--bg-soft)] text-[var(--ink)] lg:hidden",
            focusRing,
          )}
          aria-label={open ? t("home.nav.close") : t("home.nav.menu")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {drawer}
    </header>
  );
}

function Wordmark() {
  return (
    <Link
      href="/"
      className={cn(
        "shrink-0 text-[22px] font-semibold tracking-tight md:text-[24px]",
        focusRing,
        "rounded-[10px]",
      )}
      aria-label="HavenApply"
    >
      <span className="text-[var(--ink)]">Haven</span>
      <span className="text-[var(--brand-strong)]">Apply</span>
    </Link>
  );
}
