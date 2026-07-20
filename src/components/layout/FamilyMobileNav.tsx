"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  FileText,
  Home,
  MessageSquare,
  Search,
} from "lucide-react";
import { familyMobileNav } from "@/config/navigation";
import { useMessaging } from "@/lib/messaging-store";
import { cn } from "@/lib/utils";

const icons: Record<string, typeof Home> = {
  "/family/dashboard": Home,
  "/family/find-communities": Search,
  "/family/applications": CheckSquare,
  "/family/documents": FileText,
  "/family/messages": MessageSquare,
};

export function FamilyMobileNav() {
  const pathname = usePathname();
  const { unreadTotal } = useMessaging();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden"
      aria-label="Family mobile"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {familyMobileNav.map((item) => {
          const Icon = icons[item.href] ?? Home;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const showUnread = item.href === "/family/messages" && unreadTotal > 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <span className="relative">
                  <Icon size={20} />
                  {showUnread && (
                    <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-danger" />
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
