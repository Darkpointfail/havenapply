"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, homeForUser, type UserRole } from "@/lib/auth";
import {
  AUTH_OPEN_ACCESS,
  DEMO_COMMUNITY_USER,
  DEMO_FAMILY_USER,
} from "@/lib/auth-open-access";

export function RequireAuth({
  role,
  requireCommunityVerified = true,
  children,
}: {
  role: UserRole;
  /** When role is community, require verified organization (default true). */
  requireCommunityVerified?: boolean;
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const effectiveUser =
    AUTH_OPEN_ACCESS && role !== "internal"
      ? role === "community"
        ? DEMO_COMMUNITY_USER
        : DEMO_FAMILY_USER
      : user;

  useEffect(() => {
    if (AUTH_OPEN_ACCESS && role !== "internal") return;
    if (!ready) return;

    if (!user) {
      const next = encodeURIComponent(pathname);
      if (role === "community") router.replace(`/community/sign-in?next=${next}`);
      else if (role === "internal") router.replace(`/internal/sign-in?next=${next}`);
      else router.replace(`/sign-in?next=${next}`);
      return;
    }

    if (user.role !== role) {
      router.replace("/access-denied");
      return;
    }

    if (role === "community" && requireCommunityVerified && user.communityStatus !== "verified") {
      router.replace("/community/pending");
    }
  }, [ready, user, role, requireCommunityVerified, router, pathname]);

  if (AUTH_OPEN_ACCESS && role !== "internal") {
    return <>{children}</>;
  }

  if (!ready || !effectiveUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          <p className="mt-4 text-sm text-ink-muted">Checking your account…</p>
        </div>
      </div>
    );
  }

  if (effectiveUser.role !== role) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Redirecting…</p>
      </div>
    );
  }

  if (
    role === "community" &&
    requireCommunityVerified &&
    effectiveUser.communityStatus !== "verified"
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
    (pathname.startsWith("/community") ? "/community/dashboard" : "/family/dashboard");

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
