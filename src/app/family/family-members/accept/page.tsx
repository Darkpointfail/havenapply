"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import { useFamilyCollaboration } from "@/lib/family-collaboration-store";

function AcceptInviteInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const { user } = useAuth();
  const { acceptInvitation, ready } = useFamilyCollaboration();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !token || !user) return;
    if (attempted.current === token) return;
    attempted.current = token;
    const res = acceptInvitation(token);
    if (res.ok) {
      setStatus("ok");
      setMessage("Invitation accepted. You now have access with your own account.");
    } else {
      setStatus("error");
      setMessage(res.error || "Could not accept invitation.");
    }
  }, [ready, token, user, acceptInvitation]);

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <PageHeader
        title="Accept invitation"
        description="Join a family household with your own Haven login — passwords are never shared."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Family Members", href: "/family/family-members" },
          { label: "Accept" },
        ]}
      />
      <Card className="p-5">
        {!token && <p className="text-sm text-danger">Missing invitation token.</p>}
        {token && status === "idle" && (
          <p className="text-sm text-ink-muted">Accepting as {user?.email}…</p>
        )}
        {status === "ok" && <p className="text-sm text-success">{message}</p>}
        {status === "error" && <p className="text-sm text-danger">{message}</p>}
        <Button className="mt-4" href="/family/family-members" size="sm">
          Go to Family Members
        </Button>
        {status === "error" && (
          <Button
            className="mt-2"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/sign-in")}
          >
            Switch account
          </Button>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <RequireAuth role="family">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
            Loading…
          </div>
        }
      >
        <AcceptInviteInner />
      </Suspense>
    </RequireAuth>
  );
}
