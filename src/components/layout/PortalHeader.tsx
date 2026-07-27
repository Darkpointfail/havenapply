"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import type { NavGroup, NavItem } from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n/locale";
import { useMessaging } from "@/lib/messaging-store";
import { useNotificationsTasksOptional } from "@/lib/notifications-tasks-store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function pathMatches(pathname: string, href: string) {
  const pathOnly = href.split("?")[0];
  return pathname === pathOnly || pathname.startsWith(pathOnly + "/");
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const headerMenusRef = useRef<HTMLDivElement>(null);

  /** Full navigation avoids RequireAuth racing back into the portal after sign-out. */
  const handleSignOut = () => {
    signOut();
    setOpen(false);
    setOpenGroup(null);
    if (typeof window !== "undefined") {
      window.location.assign(signOutHref);
      return;
    }
    router.push(signOutHref);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMessagesHref = (href: string) => href.includes("/messages");
  const isNotificationsHref = (href: string) => href.includes("/notifications");
  const useGroups = Boolean(groups?.length);
  const accountGroup = groups?.find((g) => g.id === "account");
  const mainGroups = groups?.filter((g) => g.id !== "account") ?? [];

  const badgeForHref = (href: string) => {
    if (isMessagesHref(href) && unreadTotal > 0) return unreadTotal;
    if (isNotificationsHref(href) && notifUnread > 0) return notifUnread;
    return 0;
  };

  const badgeForGroup = (group: NavGroup) =>
    group.children.reduce((max, c) => Math.max(max, badgeForHref(c.href)), 0);

  const accountActive = accountGroup ? groupIsActive(pathname, accountGroup) : false;
  const accountExpanded = openGroup === "account";
  const accountBadge = accountGroup ? badgeForGroup(accountGroup) : 0;

  useEffect(() => {
    setOpenGroup(null);
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

  useEffect(() => {
    if (!openGroup) return;
    const onPointer = (e: MouseEvent) => {
      if (headerMenusRef.current && !headerMenusRef.current.contains(e.target as Node)) {
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
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex min-w-0 items-center gap-2">
              <Logo href={homeHref} size="md" className="!ml-0 !translate-y-0" />
              <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
                {t(badge)}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-soft text-ink"
              aria-label={t("Close menu")}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            aria-label="Portal mobile"
          >
            {useGroups
              ? groups!.map((group) => (
                  <div key={group.id}>
                    <p className="px-3 pb-1.5 text-sm font-semibold tracking-tight text-ink">
                      {group.id === "account" && user?.name ? user.name : t(group.label)}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.children.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl px-3 py-3 text-sm",
                            pathMatches(pathname, link.href)
                              ? "bg-brand-soft font-medium text-brand-strong"
                              : "text-ink hover:bg-bg-soft",
                          )}
                        >
                          <span>{t(link.label)}</span>
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
                      "flex items-center justify-between rounded-2xl px-3 py-3 text-sm",
                      pathMatches(pathname, link.href)
                        ? "bg-brand-soft font-medium text-brand-strong"
                        : "text-ink hover:bg-bg-soft",
                    )}
                  >
                    <span>{t(link.label)}</span>
                    {badgeForHref(link.href) > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                        {badgeForHref(link.href) > 9
                          ? "9+"
                          : badgeForHref(link.href)}
                      </span>
                    )}
                  </Link>
                ))}
            <div className="mt-auto space-y-3 border-t border-line pt-4">
              <div className="px-1">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t("Language")}
                </p>
                <LanguageSwitcher className="w-full justify-center" />
              </div>
              <Button variant="secondary" onClick={handleSignOut}>
                {t("Sign out")}
              </Button>
            </div>
          </nav>
        </aside>
      </div>,
      document.body,
    );

  return (
    <header className="relative z-50 border-b border-line bg-surface/90 backdrop-blur-xl md:sticky md:top-0">
      <div
        ref={headerMenusRef}
        className="relative mx-auto grid h-[5.25rem] max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-20 md:px-6 lg:flex lg:gap-3"
      >
        {/* Mobile: spacer left so logo stays centered */}
        <div className="flex items-center justify-self-start lg:hidden">
          <span className="h-10 w-10" aria-hidden />
        </div>

        {/* Mobile centered logo */}
        <div className="flex items-center justify-self-center lg:hidden">
          <Logo href={homeHref} size="lg" className="!ml-0" />
        </div>

        {/* Desktop: logo + nav */}
        <div className="hidden min-w-0 flex-1 flex-nowrap items-center gap-3 md:gap-6 lg:flex">
          <Logo href={homeHref} size="lg" />
          <span className="hidden shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold leading-none text-brand-strong sm:inline">
            {t(badge)}
          </span>
          <nav className="hidden flex-nowrap items-center gap-0.5 lg:flex" aria-label="Portal">
          {useGroups
            ? mainGroups.map((group) => {
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
                        "relative shrink-0 rounded-xl px-3.5 py-2 text-[15px] font-semibold leading-none tracking-tight transition-colors",
                        active
                          ? "bg-brand-soft text-brand-strong"
                          : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                      )}
                    >
                      {t(group.label)}
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
                        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[15px] font-semibold leading-none tracking-tight transition-colors",
                        active || expanded
                          ? "bg-brand-soft text-brand-strong"
                          : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                      )}
                    >
                      {t(group.label)}
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
                              <span>{t(child.label)}</span>
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
                    {t(link.label)}
                    {count > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center justify-self-end gap-1.5">
          <LanguageSwitcher compact />
          {homeHref.startsWith("/family") && (
            <Button
              size="sm"
              variant="soft"
              className="hidden sm:inline-flex"
              href="/assistant"
            >
              <Sparkles size={14} /> {t("Assistant")}
            </Button>
          )}
          <button
            type="button"
            onClick={toggle}
            className="hidden rounded-xl p-2 text-ink-muted hover:bg-bg-soft sm:inline-flex"
            aria-label={t("Toggle theme")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {accountGroup && user?.name ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                aria-expanded={accountExpanded}
                aria-haspopup="menu"
                aria-label={t("Account menu")}
                onClick={() => setOpenGroup(accountExpanded ? null : "account")}
                className={cn(
                  "inline-flex max-w-[160px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold leading-none transition-colors",
                  accountActive || accountExpanded
                    ? "bg-brand-soft text-brand-strong"
                    : "text-ink-muted hover:bg-bg-soft hover:text-ink",
                )}
              >
                <span className="truncate">{user.name}</span>
                {accountBadge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {accountBadge > 9 ? "9+" : accountBadge}
                  </span>
                )}
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 opacity-70 transition", accountExpanded && "rotate-180")}
                />
              </button>
              {accountExpanded && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-line bg-surface p-1.5 shadow-lg"
                >
                  <div className="border-b border-line px-2 pb-2 pt-1">
                    <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      {t("Language")}
                    </p>
                    <LanguageSwitcher className="w-full justify-center" />
                  </div>
                  {accountGroup.children.map((child) => {
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
                        <span>{t(child.label)}</span>
                        {childBadge > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                            {childBadge > 9 ? "9+" : childBadge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-muted hover:bg-bg-soft hover:text-ink"
                    onClick={handleSignOut}
                  >
                    <LogOut size={14} /> {t("Sign out")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="hidden max-w-[100px] truncate text-sm text-ink-muted lg:inline">
                {user?.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={handleSignOut}
              >
                <LogOut size={14} /> {t("Sign out")}
              </Button>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-soft lg:hidden"
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
