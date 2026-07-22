"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { publicAuthLinks, publicNav } from "@/config/navigation";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-3 pl-0 pr-5 md:h-20 md:pr-8">
        <div className="flex min-w-0 items-center justify-self-start">
          <Logo href="/" size="lg" />
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

        <div className="hidden shrink-0 items-center justify-self-end gap-2.5 lg:flex">
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
          className="col-start-3 inline-flex h-9 w-9 shrink-0 items-center justify-center justify-self-end rounded-lg bg-bg-soft lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public mobile">
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
                    active ? "bg-brand-soft font-medium text-brand-strong" : "text-ink hover:bg-bg-soft",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Button href={publicAuthLinks.signIn} variant="ghost" className="mt-2">
              Residences
            </Button>
            <Button href={publicAuthLinks.getStarted}>Families</Button>
          </nav>
        </div>
      )}
    </header>
  );
}
