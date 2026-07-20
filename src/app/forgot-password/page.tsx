"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AuthAlert,
  AuthField,
  DemoInbox,
  authInputClass,
} from "@/components/auth/AuthForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = forgotPassword(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResetToken(result.data.resetToken);
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title="Forgot password"
        description="Enter your email and we’ll send a link to reset your password."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Forgot password" }]}
      />
      <Card className="p-6">
        {sent ? (
          <div className="space-y-4">
            <AuthAlert tone="success">{AUTH_MESSAGES.resetSent}</AuthAlert>
            <DemoInbox
              email={email}
              resetHref={
                resetToken ? `/reset-password?token=${encodeURIComponent(resetToken)}` : null
              }
            />
            <Button href="/sign-in" className="w-full">
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <AuthAlert>{error}</AuthAlert>}
            <AuthField label="Email">
              <input
                required
                type="email"
                className={authInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </AuthField>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-ink-muted">
              <Link href="/sign-in" className="text-brand">
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
