"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FolderOpen, Home, MessageSquare } from "lucide-react";
import { familyMobileNav } from "@/config/navigation";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const icons: Record<string, typeof Home> = {
  "/family/dashboard": Home,
  "/family/dossier": FolderOpen,
  "/family/applications": ClipboardList,
  "/family/messages": MessageSquare,
};

export function FamilyMobileNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden"
      aria-label={t("Family mobile")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {familyMobileNav.map((item) => {
          const Icon = icons[item.href] ?? Home;
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/family/dossier" &&
              (pathname.startsWith("/family/profile") ||
                pathname.startsWith("/family/documents"))) ||
            (item.href === "/family/applications" &&
              pathname.startsWith("/family/communities"));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <Icon size={20} />
                {t(item.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
