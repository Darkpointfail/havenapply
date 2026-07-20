"use client";

import { usePathname } from "next/navigation";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { FamilyMobileNav } from "@/components/layout/FamilyMobileNav";
import { Footer } from "@/components/layout/Footer";
import { PortalHeader } from "@/components/layout/PortalHeader";
import { PublicHeader } from "@/components/layout/PublicHeader";
import {
  communityHome,
  communityNav,
  communityNavGroups,
  familyHome,
  familyNav,
  familyNavGroups,
  internalHome,
  internalNav,
  internalNavGroups,
} from "@/config/navigation";
import { useAuth } from "@/lib/auth";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isFamily =
    pathname.startsWith("/family") || pathname.startsWith("/onboarding");
  const isCommunity = pathname.startsWith("/community");
  const isInternal = pathname.startsWith("/internal");
  const isPortalAuth =
    pathname === "/community/sign-in" || pathname === "/internal/sign-in";
  const isCommunityPending = pathname === "/community/pending";
  const isPublicAuth =
    pathname === "/sign-in" ||
    pathname === "/get-started" ||
    pathname === "/check-email" ||
    pathname === "/access-denied" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify");

  if (isFamily && user?.role === "family") {
    return (
      <>
        <PortalHeader
          nav={familyNav}
          groups={familyNavGroups}
          homeHref={familyHome}
          badge="Family portal"
          signOutHref="/"
        />
        <main className="flex-1 page-enter pb-24 lg:pb-0">{children}</main>
        <AiAssistant />
        <FamilyMobileNav />
      </>
    );
  }

  if (isCommunityPending && user?.role === "community") {
    return (
      <>
        <PortalHeader
          nav={[]}
          homeHref="/community/pending"
          badge="Verification pending"
          signOutHref="/community/sign-in"
        />
        <main className="flex-1 page-enter">{children}</main>
      </>
    );
  }

  if (
    isCommunity &&
    !isPortalAuth &&
    !isCommunityPending &&
    user?.role === "community" &&
    user.communityStatus === "verified"
  ) {
    return (
      <>
        <PortalHeader
          nav={communityNav}
          groups={communityNavGroups}
          homeHref={communityHome}
          badge="Community portal"
          signOutHref="/community/sign-in"
        />
        <main className="flex-1 page-enter">{children}</main>
      </>
    );
  }

  if (isInternal && !isPortalAuth && user?.role === "internal") {
    return (
      <>
        <PortalHeader
          nav={internalNav}
          groups={internalNavGroups}
          homeHref={internalHome}
          badge="Internal admin"
          signOutHref="/internal/sign-in"
        />
        <main className="flex-1 page-enter">{children}</main>
      </>
    );
  }

  // Public site (and auth pages, and portal sign-in while logged out)
  const hideFooter = isPublicAuth || isPortalAuth || isFamily || isCommunity || isInternal;

  return (
    <>
      <PublicHeader />
      <main className="flex-1 page-enter">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}
