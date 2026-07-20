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
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 md:h-[68px] md:px-8">
        <Logo href="/" />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Public">
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
                    "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-soft text-brand-strong"
                      : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2.5 text-ink-muted hover:bg-bg-soft"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Button href={publicAuthLinks.signIn} size="sm" variant="ghost">
            Sign In
          </Button>
          <Button href={publicAuthLinks.getStarted} size="sm">
            Get Started
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public mobile">
            {publicNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-ink hover:bg-bg-soft"
              >
                {link.label}
              </Link>
            ))}
            <Button href={publicAuthLinks.signIn} variant="ghost" className="mt-2">
              Sign In
            </Button>
            <Button href={publicAuthLinks.getStarted}>Get Started</Button>
          </nav>
        </div>
      )}
    </header>
  );
}
