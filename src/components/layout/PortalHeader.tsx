"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import type { NavGroup, NavItem } from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { useMessaging } from "@/lib/messaging-store";
import { useNotificationsTasksOptional } from "@/lib/notifications-tasks-store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.children.some((c) => pathMatches(pathname, c.href));
}

export function PortalHeader({
  nav,
  groups,
  homeHref,
  badge,
  signOutHref,
}: {
  nav: NavItem[];
  /** When set, header shows a few main titles with nested links */
  groups?: NavGroup[];
  homeHref: string;
  badge: string;
  signOutHref: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unreadTotal } = useMessaging();
  const notifTasks = useNotificationsTasksOptional();
  const notifUnread = notifTasks?.unreadCount ?? 0;
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const isMessagesHref = (href: string) => href.includes("/messages");
  const isNotificationsHref = (href: string) => href.includes("/notifications");
  const useGroups = Boolean(groups?.length);

  const badgeForHref = (href: string) => {
    if (isMessagesHref(href) && unreadTotal > 0) return unreadTotal;
    if (isNotificationsHref(href) && notifUnread > 0) return notifUnread;
    return 0;
  };

  const badgeForGroup = (group: NavGroup) =>
    group.children.reduce((max, c) => Math.max(max, badgeForHref(c.href)), 0);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (!openGroup) return;
    const onPointer = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const messagesUnread = (href: string) => isMessagesHref(href) && unreadTotal > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between gap-4 px-4 md:h-20 md:px-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Logo href={homeHref} size="lg" />
          <span className="hidden rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-strong sm:inline">
            {badge}
          </span>
        </div>

        <nav
          ref={navRef}
          className="hidden items-center gap-0.5 lg:flex"
          aria-label="Portal"
        >
          {useGroups
            ? groups!.map((group) => {
                const active = groupIsActive(pathname, group);
                const hasMenu = group.children.length > 1;
                const groupBadge = badgeForGroup(group);

                if (!hasMenu) {
                  const count = badgeForHref(group.href);
                  return (
                    <Link
                      key={group.id}
                      href={group.href}
                      className={cn(
                        "relative shrink-0 rounded-xl px-3.5 py-2.5 text-base font-semibold tracking-tight transition-colors",
                        active
                          ? "bg-brand-soft text-brand-strong"
                          : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                      )}
                    >
                      {group.label}
                      {count > 0 && (
                        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                    </Link>
                  );
                }

                const expanded = openGroup === group.id;
                return (
                  <div key={group.id} className="relative">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-haspopup="menu"
                      onClick={() => setOpenGroup(expanded ? null : group.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-base font-semibold tracking-tight transition-colors",
                        active || expanded
                          ? "bg-brand-soft text-brand-strong"
                          : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                      )}
                    >
                      {group.label}
                      {groupBadge > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                          {groupBadge > 9 ? "9+" : groupBadge}
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        className={cn("opacity-70 transition", expanded && "rotate-180")}
                      />
                    </button>
                    {expanded && (
                      <div
                        role="menu"
                        className="absolute left-0 top-full z-50 mt-1.5 min-w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-lg"
                      >
                        {group.children.map((child) => {
                          const childActive = pathMatches(pathname, child.href);
                          const childBadge = badgeForHref(child.href);
                          return (
                            <Link
                              key={child.href}
                              role="menuitem"
                              href={child.href}
                              onClick={() => setOpenGroup(null)}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                childActive
                                  ? "bg-brand-soft font-medium text-brand-strong"
                                  : "text-ink hover:bg-bg-soft",
                              )}
                            >
                              <span>{child.label}</span>
                              {childBadge > 0 && (
                                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                                  {childBadge > 9 ? "9+" : childBadge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            : nav.map((link) => {
                const active = pathMatches(pathname, link.href);
                const count = badgeForHref(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand-strong"
                        : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                    )}
                  >
                    {link.label}
                    {count > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="hidden max-w-[100px] truncate text-sm text-ink-muted lg:inline">
            {user?.name}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
            onClick={() => {
              signOut();
              router.push(signOutHref);
            }}
          >
            <LogOut size={14} /> Sign out
          </Button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-line bg-surface px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-3" aria-label="Portal mobile">
            {useGroups
              ? groups!.map((group) => (
                  <div key={group.id}>
                    <p className="px-3 pb-1.5 text-sm font-semibold tracking-tight text-ink">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.children.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                            pathMatches(pathname, link.href)
                              ? "bg-brand-soft font-medium text-brand-strong"
                              : "text-ink hover:bg-bg-soft",
                          )}
                        >
                          <span>{link.label}</span>
                          {badgeForHref(link.href) > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                              {badgeForHref(link.href) > 9
                                ? "9+"
                                : badgeForHref(link.href)}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              : nav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                      pathMatches(pathname, link.href)
                        ? "bg-brand-soft font-medium text-brand-strong"
                        : "text-ink hover:bg-bg-soft",
                    )}
                  >
                    <span>{link.label}</span>
                    {badgeForHref(link.href) > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                        {badgeForHref(link.href) > 9
                          ? "9+"
                          : badgeForHref(link.href)}
                      </span>
                    )}
                  </Link>
                ))}
            <Button
              className="mt-2"
              variant="secondary"
              onClick={() => {
                signOut();
                setOpen(false);
                router.push(signOutHref);
              }}
            >
              Sign out
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
