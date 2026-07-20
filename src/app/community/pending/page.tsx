"use client";

import { Clock3 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";

function PendingInner() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-lg px-5 py-12 md:py-16">
      <PageHeader
        title="Community verification"
        description="Your account is ready — Haven still needs to verify your organization."
        breadcrumbs={[{ label: "Community" }, { label: "Pending verification" }]}
      />
      <Card className="p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Clock3 size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold">
          {user?.organization || "Your community"} is under review
        </h2>
        <p className="mt-2 text-ink-muted">{AUTH_MESSAGES.communityPending}</p>
        <p className="mt-4 text-sm text-ink-faint">
          Signed in as {user?.email}. You’ll be able to open the community portal once verification
          is complete.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button href="/" variant="secondary">
            Back to Haven
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              window.location.href = "/community/sign-in";
            }}
          >
            Sign out
          </Button>
        </div>
        <p className="mt-6 text-xs text-ink-faint">
          Demo tip: sign in with community@demo.haven / HavenDemo1! for a verified community portal.
        </p>
      </Card>
    </div>
  );
}

export default function CommunityPendingPage() {
  return (
    <RequireAuth role="community" requireCommunityVerified={false}>
      <PendingInner />
    </RequireAuth>
  );
}
