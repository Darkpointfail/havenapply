"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useAi } from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const marketingLinks = [
  { href: "/#problem", label: "Why Haven" },
  { href: "/#ai", label: "AI" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/find-senior-living", label: "Browse" },
];

const familyLinks = [
  { href: "/family/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/family/find-communities", label: "Communities", icon: Search },
  { href: "/family/applications", label: "My applications", icon: CheckSquare },
  { href: "/family/documents", label: "Documents", icon: FileText },
  { href: "/family/messages", label: "Messages", icon: MessageSquare },
  { href: "/family/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { setOpen: openAi } = useAi();
  const [open, setOpen] = useState(false);

  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/get-started") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/community/sign-in") ||
    pathname.startsWith("/hospital-login");

  const isCommunityUser =
    user?.role === "community" || user?.role === "facility";

  const isPortal =
    pathname.startsWith("/community") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/hospital") ||
    isCommunityUser;

  if (isPortal && isCommunityUser) {
    return (
      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between pl-0 pr-5 md:h-20 md:pr-8">
          <div className="flex items-center gap-3">
            <Logo href="/community/dashboard" size="lg" />
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold leading-none text-accent">
              Community portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                signOut();
                router.push("/community/sign-in");
              }}
            >
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const links = user?.role === "family" ? familyLinks : marketingLinks;
  const isFamily = user?.role === "family";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center gap-3 pl-0 pr-5 md:h-20 md:pr-8">
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-4 md:gap-7">
          <Logo href={isFamily ? "/family/dashboard" : "/"} size="lg" />
          <nav
            className="hidden flex-nowrap items-center gap-0.5 lg:flex"
            aria-label="Primary"
          >
            {links.map((link) => {
              const active =
                !link.href.includes("#") &&
                (pathname === link.href || pathname.startsWith(link.href + "/"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-[15px] font-medium leading-none transition-colors",
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
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2.5 text-ink-muted hover:bg-bg-soft hover:text-ink"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {!ready ? null : isFamily ? (
            <>
              <button
                type="button"
                onClick={() => openAi(true)}
                className="rounded-xl p-2.5 text-ink-muted hover:bg-ai-soft hover:text-ai"
                aria-label="Ask AI"
              >
                <Sparkles size={16} />
              </button>
              <Link
                href="/notifications"
                className="relative rounded-xl p-2.5 text-ink-muted hover:bg-bg-soft hover:text-ink"
              >
                <Bell size={16} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
              </Link>
              <Link
                href="/family/settings"
                className="rounded-xl p-2.5 text-ink-muted hover:bg-bg-soft hover:text-ink"
              >
                <Settings size={16} />
              </Link>
              <span className="mx-1 max-w-[120px] truncate text-sm text-ink-muted">{user.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
              >
                <LogOut size={14} />
              </Button>
            </>
          ) : !isAuthPage ? (
            <>
              <Button href="/sign-in" size="sm" variant="ghost">
                Log in
              </Button>
              <Button href="/get-started" size="sm">
                Start your application
              </Button>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-soft text-ink lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-ink hover:bg-bg-soft"
              >
                {link.label}
              </Link>
            ))}
            {isFamily ? (
              <Button
                className="mt-2"
                variant="secondary"
                onClick={() => {
                  signOut();
                  setOpen(false);
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            ) : (
              <>
                <Button href="/sign-in" variant="ghost" className="mt-2">
                  Log in
                </Button>
                <Button href="/get-started">Start your application</Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
