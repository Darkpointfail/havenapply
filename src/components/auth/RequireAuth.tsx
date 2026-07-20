"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, homeForUser, type UserRole } from "@/lib/auth";

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

  useEffect(() => {
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

  if (user.role !== role) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Redirecting…</p>
      </div>
    );
  }

  if (role === "community" && requireCommunityVerified && user.communityStatus !== "verified") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}

/** Redirect signed-in users away from auth pages to their home. */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(homeForUser(user));
  }, [ready, user, router]);

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
