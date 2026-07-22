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
  familyHome,
  familyNav,
  familyNavGroups,
  internalHome,
  internalNav,
  internalNavGroups,
} from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import {
  AUTH_OPEN_ACCESS,
  isFamilyBrowsePath,
  isFamilyPortalPath,
} from "@/lib/auth-open-access";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCoreFamily = isFamilyPortalPath(pathname);
  const isBrowse = isFamilyBrowsePath(pathname);
  const isCommunity = pathname.startsWith("/community");
  const isInternal = pathname.startsWith("/internal");
  const isPortalAuth =
    pathname === "/community/sign-in" ||
    pathname === "/community/get-started" ||
    pathname === "/internal/sign-in";
  const isCommunityPending = pathname === "/community/pending";
  const isPublicAuth =
    pathname === "/sign-in" ||
    pathname === "/get-started" ||
    pathname === "/check-email" ||
    pathname === "/access-denied" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify");

  // Family shell on portal routes, or on browse/detail only when signed in as family
  const showFamilyShell = user?.role === "family" && (isCoreFamily || isBrowse);

  const communitySession =
    (user?.role === "community" && user.communityStatus === "verified") ||
    (AUTH_OPEN_ACCESS && isCommunity && !isPortalAuth && !isCommunityPending);

  if (showFamilyShell) {
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

  if (isCommunityPending && (user?.role === "community" || AUTH_OPEN_ACCESS)) {
    return (
      <>
        <PortalHeader
          nav={[]}
          homeHref="/community/pending"
          badge="Verification pending"
          signOutHref="/"
        />
        <main className="flex-1 page-enter">{children}</main>
      </>
    );
  }

  if (isCommunity && !isPortalAuth && !isCommunityPending && communitySession) {
    return (
      <>
        <PortalHeader
          nav={communityNav}
          homeHref={communityHome}
          badge="Admissions"
          signOutHref="/"
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

  const hideFooter = isPublicAuth || isPortalAuth || isCoreFamily || isCommunity || isInternal;

  return (
    <>
      <PublicHeader />
      <main className="flex-1 page-enter">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}
