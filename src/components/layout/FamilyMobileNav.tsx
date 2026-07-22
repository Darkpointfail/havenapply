"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Search, UserRound } from "lucide-react";
import { familyMobileNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

const icons: Record<string, typeof Home> = {
  "/family/dashboard": Home,
  "/family/profile": UserRound,
  "/family/find-communities": Search,
  "/family/applications": ClipboardList,
};
export function FamilyMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden"
      aria-label="Family mobile"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {familyMobileNav.map((item) => {
          const Icon = icons[item.href] ?? Home;
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/family/profile" &&
              (pathname.startsWith("/family/senior-profile") ||
                pathname.startsWith("/family/documents") ||
                pathname.startsWith("/family/care-needs")));
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
