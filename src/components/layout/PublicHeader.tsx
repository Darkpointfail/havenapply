"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { publicAuthLinks, publicNav } from "@/config/navigation";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-surface/90 backdrop-blur-xl">
      <div className="relative mx-auto grid h-[4.5rem] max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-20 md:px-8">
        {/* Left spacer on mobile keeps logo optically centered */}
        <div className="flex items-center justify-self-start lg:contents">
          <div className="hidden min-w-0 items-center lg:flex">
            <Logo href="/" size="lg" />
          </div>
          <span className="h-9 w-9 lg:hidden" aria-hidden />
        </div>

        <div className="justify-self-center lg:contents">
          <div className="lg:hidden">
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
                    {link.label}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="flex items-center justify-self-end gap-1.5">
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-ink-muted hover:bg-bg-soft"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button href={publicAuthLinks.signIn} size="sm" variant="ghost">
              Residences
            </Button>
            <Button href={publicAuthLinks.getStarted} size="sm" className="shadow-xs">
              Families
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-soft lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer from the right */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-ink/40 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-line bg-surface shadow-lift transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-[4.5rem] items-center justify-between border-b border-line px-4">
            <p className="text-sm font-semibold text-ink">Menu</p>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bg-soft"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4" aria-label="Public mobile">
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
                    "rounded-xl px-3 py-3",
                    active
                      ? "bg-brand-soft font-medium text-brand-strong"
                      : "text-ink hover:bg-bg-soft",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <Button href={publicAuthLinks.signIn} variant="ghost" className="w-full">
                Residences
              </Button>
              <Button href={publicAuthLinks.getStarted} className="w-full">
                Families
              </Button>
              <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm text-ink-muted hover:bg-bg-soft"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
