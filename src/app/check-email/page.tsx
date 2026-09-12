"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AuthAlert, DemoInbox, authInputClass } from "@/components/auth/AuthForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { useT } from "@/lib/i18n/locale";

const RESEND_COOLDOWN_SECONDS = 45;

/** Supabase mode: a 6-digit code instead of a link to click — no broken-link
 * or wrong-mail-client failure mode. Local backend keeps the existing
 * link-based screen below untouched (it never produces this state anyway:
 * signUp() on the local path always signs in immediately). */
function CodeEntryForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const { verifyEmailCode, resendConfirmationEmail } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (verifying || code.length !== 6) return;
    setVerifying(true);
    setError(null);
    const result = await verifyEmailCode(email, code);
    setVerifying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(next);
  };

  const onResend = async () => {
    if (resending || cooldown > 0 || !email) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    const result = await resendConfirmationEmail(email);
    setResending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResendMessage("Un nouveau code a été envoyé.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <Card className="p-6">
      <p className="text-sm text-ink-muted">
        Entrez le code à 6 chiffres envoyé à{" "}
        <span className="font-medium text-ink">{email || "votre courriel"}</span>.
      </p>
      {error && <AuthAlert className="mt-4">{error}</AuthAlert>}
      {resendMessage && (
        <AuthAlert tone="success" className="mt-4">
          {resendMessage}
        </AuthAlert>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-ink">Code de vérification</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={`${authInputClass} mt-1.5 text-center text-lg tracking-[0.5em]`}
          />
        </label>
        <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
          {verifying ? "Vérification…" : "Vérifier"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={resending || cooldown > 0}
          onClick={onResend}
        >
          {resending
            ? "Envoi…"
            : cooldown > 0
              ? `Renvoyer le code (${cooldown}s)`
              : "Renvoyer le code"}
        </Button>
      </form>
    </Card>
  );
}

function CheckEmailInner() {
  const t = useT();
  const { resendConfirmationEmail } = useAuth();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token");
  const role = params.get("role") || "family";
  const next = params.get("next") || (role === "family" ? "/family/dashboard" : "/sign-in");
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

  if (isSupabaseBackend()) {
    return (
      <div className="mx-auto max-w-md px-5 py-12 md:py-16">
        <PageHeader
          title="Vérifiez votre courriel"
          description="Entrez le code reçu pour activer votre compte."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Vérifier" }]}
        />
        <CodeEntryForm email={email} next={next} />
        <p className="mt-6 text-center text-sm text-ink-muted">
          Mauvaise adresse ?{" "}
          <Link href="/get-started" className="font-medium text-brand">
            {t("Start over")}
          </Link>
        </p>
      </div>
    );
  }

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
