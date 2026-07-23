"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, homeForUser, type UserRole } from "@/lib/auth";
import {
  AUTH_OPEN_ACCESS,
  isCommunityPortalPath,
  isProfessionalPortalPath,
} from "@/lib/auth-open-access";
import { isFacilityRole } from "@/lib/auth-store";
import {
  openAccessHomeForPath,
  roleSatisfies,
  signInPathForRole,
} from "@/lib/permissions";

export function RequireAuth({
  role,
  requireCommunityVerified = true,
  children,
}: {
  role: UserRole;
  /** When role is community/facility, require verified organization (default true). */
  requireCommunityVerified?: boolean;
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      const next = encodeURIComponent(pathname);
      router.replace(`${signInPathForRole(role)}?next=${next}`);
      return;
    }

    if (!roleSatisfies(user.role, role)) {
      router.replace("/access-denied");
      return;
    }

    if (isFacilityRole(role) && requireCommunityVerified && user.communityStatus !== "verified") {
      router.replace("/community/pending");
    }
  }, [ready, user, role, requireCommunityVerified, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          <p className="mt-4 text-sm text-ink-muted">Checking your account…</p>
        </div>
      </div>
    );
  }

  if (!roleSatisfies(user.role, role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Redirecting…</p>
      </div>
    );
  }

  if (
    isFacilityRole(role) &&
    requireCommunityVerified &&
    user.communityStatus !== "verified"
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}

/** Redirect signed-in users away from auth pages to their home. */
export function RedirectIfAuthenticated({
  children,
  fallbackHref,
}: {
  children: React.ReactNode;
  /** Used when AUTH_OPEN_ACCESS is on (no real session). */
  fallbackHref?: string;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const openAccessHome =
    fallbackHref ||
    (isProfessionalPortalPath(pathname)
      ? "/professional/dashboard"
      : isCommunityPortalPath(pathname) || pathname.startsWith("/community")
        ? "/community/dashboard"
        : openAccessHomeForPath(pathname));

  const isRegistrationPath =
    pathname === "/get-started" ||
    pathname.startsWith("/get-started/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/");

  useEffect(() => {
    if (AUTH_OPEN_ACCESS) {
      if (pathname.startsWith("/internal") || isRegistrationPath) return;
      router.replace(openAccessHome);
      return;
    }
    if (!ready || !user) return;
    router.replace(homeForUser(user));
  }, [ready, user, router, openAccessHome, pathname, isRegistrationPath]);

  if (AUTH_OPEN_ACCESS && !pathname.startsWith("/internal") && !isRegistrationPath) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ink-muted">Opening portal…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ink-muted">Taking you to your portal…</p>
      </div>
    );
  }

  return <>{children}</>;
}
