"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_OPEN_ACCESS, markOpenFamilySession } from "@/lib/auth-open-access";
import { CommunityDetailView } from "@/components/residences/CommunityDetail";
import type { CommunityDetail } from "@/lib/residence-detail";

/**
 * Establishment details require a family account.
 * Public visitors see a gate; signed-in families see the full profile.
 */
export function CommunityDetailGate({ community }: { community: CommunityDetail }) {
  const { user, ready } = useAuth();
  const next = `/find-senior-living/${community.id}`;

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (user?.role === "family") {
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
          Sign in or create a family account to view details for{" "}
          <span className="font-medium text-ink">{community.name}</span> and apply with your
          dossier.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {AUTH_OPEN_ACCESS ? (
            <Button
              type="button"
              onClick={() => {
                markOpenFamilySession();
                window.location.assign(next);
              }}
            >
              Continue to family portal
            </Button>
          ) : (
            <>
              <Button href={`/get-started?next=${encodeURIComponent(next)}`}>Get started</Button>
              <Button href={`/sign-in?next=${encodeURIComponent(next)}`} variant="secondary">
                Sign in
              </Button>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          <Link href="/find-senior-living" className="underline-offset-2 hover:underline">
            Back to Find Senior Living
          </Link>
        </p>
      </Card>
    </div>
  );
}
