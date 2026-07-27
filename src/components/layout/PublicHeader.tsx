"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { publicAuthLinks, publicNav } from "@/config/navigation";
import { useT } from "@/lib/i18n/locale";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
            "absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label={t("Close menu")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(100%,19.5rem)] flex-col rounded-l-3xl border-l border-line bg-surface shadow-lift transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("Navigation menu")}
        >
          <div className="flex min-h-16 items-center justify-between border-b border-line px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Logo href="/" size="md" className="!ml-0 !translate-y-0" />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-soft text-ink"
              aria-label={t("Close menu")}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            aria-label="Public mobile"
          >
            {publicNav.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl px-4 py-3.5 text-[15px] transition-colors",
                    active
                      ? "bg-brand-soft font-semibold text-brand-strong"
                      : "font-medium text-ink hover:bg-bg-soft",
                  )}
                >
                  {t(link.label)}
                </Link>
              );
            })}
            <div className="mt-auto space-y-2 border-t border-line pt-5">
              <div className="flex justify-center pb-1">
                <LanguageSwitcher />
              </div>
              <Button href={publicAuthLinks.signIn} variant="secondary" className="w-full">
                {t("Log in")}
              </Button>
              <Button href={publicAuthLinks.register} className="w-full">
                {t("Register")}
              </Button>
              <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-ink-muted hover:bg-bg-soft"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? t("Light mode") : t("Dark mode")}
              </button>
            </div>
          </nav>
        </aside>
      </div>,
      document.body,
    );

  return (
    <header className="relative z-50 border-b border-line/80 bg-surface/90 backdrop-blur-xl md:sticky md:top-0">
      <div className="relative mx-auto grid h-[5.25rem] max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-20 md:px-8">
        <div className="flex items-center justify-self-start lg:contents">
          <div className="hidden min-w-0 items-center lg:flex">
            <Logo href="/" size="lg" />
          </div>
          <span className="h-10 w-10 lg:hidden" aria-hidden />
        </div>

        <div className="flex items-center justify-self-center lg:contents">
          <div className="flex items-center lg:hidden">
            <Logo href="/" size="lg" className="!ml-0" />
          </div>
          <nav
            className="hidden flex-nowrap items-center justify-center gap-0.5 lg:flex"
            aria-label="Public"
          >
            {publicNav
              .filter((l) => l.href !== "/")
              .map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-2 text-[15px] font-medium leading-none transition-colors",
                      active
                        ? "bg-brand-soft text-brand-strong ring-1 ring-brand/15"
                        : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                    )}
                  >
                    {t(link.label)}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="flex items-center justify-self-end gap-1.5">
          <LanguageSwitcher compact />
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-ink-muted hover:bg-bg-soft"
              aria-label={t("Toggle theme")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button href={publicAuthLinks.signIn} size="sm" variant="ghost">
              {t("Log in")}
            </Button>
            <Button href={publicAuthLinks.register} size="sm" className="shadow-xs">
              {t("Register")}
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-soft lg:hidden"
            aria-label={open ? t("Close menu") : t("Open menu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {drawer}
    </header>
  );
}
