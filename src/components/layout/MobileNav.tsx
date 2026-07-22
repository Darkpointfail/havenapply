"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, FileText, Home, MessageSquare, Search } from "lucide-react";
import { familyMobileNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

const icons = {
  "/family/dashboard": Home,
  "/family/find-communities": Search,
  "/family/applications": CheckSquare,
  "/family/documents": FileText,
  "/family/messages": MessageSquare,
} as const;

/** @deprecated Prefer FamilyMobileNav, kept for compatibility */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 py-2">
        {familyMobileNav.map((item) => {
          const Icon = icons[item.href as keyof typeof icons] ?? Home;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
