"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth, homeForUser } from "@/lib/auth";
import { isFacilityRole } from "@/lib/auth-store";
import { canViewCommunityProfiles } from "@/lib/permissions";
import { CommunityDetailView } from "@/components/residences/CommunityDetail";
import type { CommunityDetail } from "@/lib/residence-detail";
import { useT } from "@/lib/i18n/locale";

/**
 * Community profiles are publicly viewable.
 * Apply / messaging still require a Family or Care Professional account.
 * Community and internal portal users are steered back to their own tools.
 */
export function CommunityDetailGate({ community }: { community: CommunityDetail }) {

  const t = useT();  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (user && (isFacilityRole(user.role) || user.role === "internal")) {
    const home = homeForUser(user);
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Lock size={20} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Different portal</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {t("Community profiles are for families and care professionals. Continue in your own")}
            portal to manage admissions.
          </p>
          <div className="mt-6">
            <Button href={home}>Go to my portal</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (canViewCommunityProfiles(user)) {
    return <CommunityDetailView community={community} />;
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Lock size={20} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Account required</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Sign in as a family or care professional to view details for{" "}
          <span className="font-medium text-ink">{community.name}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button href="/get-started">Get started</Button>
          <Button href="/sign-in" variant="secondary">
            {t("Sign in")}
          </Button>
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          <Link href="/find-senior-living" className="underline-offset-2 hover:underline">
            {t("Back to Find Senior Living")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
