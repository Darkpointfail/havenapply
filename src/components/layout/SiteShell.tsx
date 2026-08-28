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
  professionalHome,
  professionalNav,
} from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { isFacilityRole } from "@/lib/auth-store";
import {
  AUTH_OPEN_ACCESS,
  isFamilyPortalPath,
  isProfessionalPortalPath,
  isSharedBrowsePath,
} from "@/lib/auth-open-access";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCoreFamily = isFamilyPortalPath(pathname);
  const isBrowse = isSharedBrowsePath(pathname);
  const isFamilyEspace = pathname.startsWith("/family/espace");
  const isCommunity = pathname.startsWith("/community") || pathname.startsWith("/admin");
  const isProfessional = isProfessionalPortalPath(pathname);
  const isInternal = pathname.startsWith("/internal");
  const isPortalAuth =
    pathname === "/community/sign-in" ||
    pathname === "/community/get-started" ||
    pathname === "/internal/sign-in";
  const isCommunityPending = pathname === "/community/pending";
  const isSiteAccess = pathname === "/site-access";
  const isPublicAuth =
    pathname === "/sign-in" ||
    pathname === "/get-started" ||
    pathname === "/check-email" ||
    pathname === "/access-denied" ||
    pathname === "/site-access" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify");

  if (isSiteAccess) {
    return <main className="flex-1">{children}</main>;
  }

  const isProfessionalUser = user?.role === "professional";
  const isFamilyUser = user?.role === "family";
  const isCommunityUser = user ? isFacilityRole(user.role) : false;

  // Shared browse keeps the active portal chrome (family or professional).
  const showProfessionalShell =
    isProfessionalUser && (isProfessional || isBrowse)
      ? true
      : AUTH_OPEN_ACCESS && isProfessional;

  const showFamilyShell = isFamilyUser && (isCoreFamily || isBrowse);

  const communitySession =
    (isCommunityUser && user?.communityStatus === "verified") ||
    (AUTH_OPEN_ACCESS && isCommunity && !isPortalAuth && !isCommunityPending);

  if (showProfessionalShell) {
    return (
      <>
        <PortalHeader
          nav={professionalNav}
          homeHref={professionalHome}
          badge="Care professional"
          signOutHref="/"
        />
        <main className="flex-1 page-enter">{children}</main>
      </>
    );
  }

  if (showFamilyShell) {
    if (isFamilyEspace) {
      return <main className="flex-1">{children}</main>;
    }
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

  if (isCommunityPending && (isCommunityUser || AUTH_OPEN_ACCESS)) {
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
          signOutHref="/community/sign-in?signedOut=1"
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

  const hideChrome =
    isPublicAuth || isPortalAuth || isCoreFamily || isCommunity || isInternal || isProfessional;

  return (
    <>
      {!hideChrome && <PublicHeader />}
      <main className="flex-1 page-enter">{children}</main>
      {!hideChrome && <Footer />}
    </>
  );
}
