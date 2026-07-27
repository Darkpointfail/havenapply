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
import { useT } from "@/lib/i18n/locale";

function CheckEmailInner() {
  const t = useT();
  const { resendConfirmationEmail } = useAuth();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token");
  const role = params.get("role") || "family";
  const next = params.get("next") || (role === "family" ? "/setup" : "/sign-in");
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
    const result = await resendConfirmationEmail(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmToken(result.data.confirmToken || null);
    setMessage(AUTH_MESSAGES.resendSuccess);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title={t("Confirm your email")}
        description="We sent a confirmation link. Confirm your address before signing in."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Confirm email" }]}
      />
      <Card className="p-6">
        <p className="text-sm text-ink-muted">
          Sent to <span className="font-medium text-ink">{email || "your email"}</span>
          {role === "community"
            ? ". After confirming, you can sign in, portal access waits on community verification."
            : ". After confirming and signing in, you choose: talk with Haven or fill forms."}
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
          <Button href={`/sign-in?next=${encodeURIComponent(next)}`} variant="ghost" className="w-full">
            {t("Back to Sign In")}
          </Button>
        </form>
        {confirmToken ? (
          <DemoInbox
            email={email}
            confirmHref={`/verify?token=${encodeURIComponent(confirmToken)}&next=${encodeURIComponent(next)}`}
          />
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Open the confirmation link in your email (check spam). After confirming, sign in.
          </p>
        )}
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Wrong email?{" "}
        <Link href="/get-started" className="font-medium text-brand">
          {t("Start over")}
        </Link>
      </p>
    </div>
  );
}

export default function CheckEmailPage() {

  const t = useT();  return (
    <Suspense>
      <CheckEmailInner />
    </Suspense>
  );
}
