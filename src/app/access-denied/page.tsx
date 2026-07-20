"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth, homeForUser } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";

export default function AccessDeniedPage() {
  const { user, signOut } = useAuth();
  const home = user ? homeForUser(user) : "/";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <Card className="p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <ShieldAlert size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-2 text-ink-muted">{AUTH_MESSAGES.accessDenied}</p>
        <div className="mt-8 flex flex-col gap-2">
          <Button href={home} size="lg">
            {user ? "Go to my portal" : "Go home"}
          </Button>
          {user ? (
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                window.location.href = "/sign-in";
              }}
            >
              Sign out and switch account
            </Button>
          ) : (
            <Button href="/sign-in" variant="ghost">
              Sign In
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
