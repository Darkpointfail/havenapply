"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthAlert, DemoInbox } from "@/components/auth/AuthForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";

function CheckEmailInner() {
  const { resendConfirmationEmail } = useAuth();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token");
  const role = params.get("role") || "family";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmToken, setConfirmToken] = useState(token);

  const resend = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !email) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = resendConfirmationEmail(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmToken(result.data.confirmToken);
    setMessage(AUTH_MESSAGES.resendSuccess);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title="Confirm your email"
        description="We sent a confirmation link. Confirm your address before signing in."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Confirm email" }]}
      />
      <Card className="p-6">
        <p className="text-sm text-ink-muted">
          Sent to <span className="font-medium text-ink">{email || "your email"}</span>
          {role === "community"
            ? ". After confirming, you can sign in — portal access waits on community verification."
            : ". After confirming, sign in to continue family onboarding."}
        </p>
        {error && <AuthAlert className="mt-4">{error}</AuthAlert>}
        {message && (
          <AuthAlert tone="success" className="mt-4">
            {message}
          </AuthAlert>
        )}
        <form onSubmit={resend} className="mt-6 space-y-3">
          <Button type="submit" variant="secondary" className="w-full" disabled={submitting || !email}>
            {submitting ? "Sending…" : "Resend confirmation email"}
          </Button>
          <Button href="/sign-in" variant="ghost" className="w-full">
            Back to Sign In
          </Button>
        </form>
        <DemoInbox
          email={email}
          confirmHref={
            confirmToken ? `/verify?token=${encodeURIComponent(confirmToken)}` : null
          }
        />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Wrong email?{" "}
        <Link href="/get-started" className="font-medium text-brand">
          Start over
        </Link>
      </p>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailInner />
    </Suspense>
  );
}
