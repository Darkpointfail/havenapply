"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { publicAuthLinks, publicNav } from "@/config/navigation";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-strong)] focus-visible:ring-offset-2";

export function MarketingHeader() {
  const t = useT();
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
          aria-label={t("Close menu")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("Navigation menu")}
        >
          <div className="flex min-h-16 items-center justify-between border-b border-[var(--line)] px-5">
            <Logo href="/" size="nav" className="!ml-0 !translate-y-0" />
            <button
              type="button"
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--bg-soft)] text-[var(--ink)]",
                focusRing,
              )}
              aria-label={t("Close menu")}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav
            className="flex flex-1 flex-col gap-1 px-4 py-5"
            aria-label={t("Navigation menu")}
          >
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-[14px] px-4 py-3.5 text-[17px] font-medium transition-colors",
                  focusRing,
                  isActive(item.href)
                    ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-soft)]",
                )}
              >
                {t(item.label)}
              </Link>
            ))}
            <div className="mt-auto space-y-3 border-t border-[var(--line)] pt-5">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
              <Link
                href={publicAuthLinks.signIn}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-[14px] border-[1.5px] border-[var(--line-strong)] text-[17px] font-semibold text-[var(--ink)]",
                  focusRing,
                )}
              >
                {t("Log in")}
              </Link>
              <Link
                href={publicAuthLinks.register}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-[14px] bg-[var(--brand-strong)] text-[17px] font-semibold text-white",
                  focusRing,
                )}
              >
                {t("Get started")}
              </Link>
            </div>
          </nav>
        </aside>
      </div>,
      document.body,
    );

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-[1320px] items-center gap-5 px-5 md:h-[4.75rem] md:gap-8 md:px-16">
        <Logo href="/" size="nav" className="!ml-0 !translate-y-0 self-center" />

        <nav
          className="hidden flex-1 items-center gap-0.5 self-center lg:flex"
          aria-label={t("Public")}
        >
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-10 items-center rounded-[14px] px-3 text-[16px] font-medium leading-none transition-colors",
                focusRing,
                isActive(item.href)
                  ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]",
              )}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 self-center lg:flex">
          <LanguageSwitcher />
          <Link
            href={publicAuthLinks.signIn}
            className={cn(
              "inline-flex h-11 min-w-[7rem] items-center justify-center rounded-[14px] px-4 text-[16px] font-semibold leading-none text-[var(--ink)] transition-colors hover:bg-[var(--bg-soft)]",
              focusRing,
            )}
          >
            {t("Log in")}
          </Link>
          <Link
            href={publicAuthLinks.register}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-[14px] bg-[var(--brand-strong)] px-5 text-[16px] font-semibold leading-none text-white transition-colors hover:brightness-95",
              focusRing,
            )}
          >
            {t("Get started")}
          </Link>
        </div>

        <button
          type="button"
          className={cn(
            "ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[14px] bg-[var(--bg-soft)] text-[var(--ink)] lg:hidden",
            focusRing,
          )}
          aria-label={open ? t("Close menu") : t("Open menu")}
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

/** @deprecated use MarketingHeader */
export const HomeHeader = MarketingHeader;
