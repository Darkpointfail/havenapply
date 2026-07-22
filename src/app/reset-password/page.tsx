"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  AuthAlert,
  AuthField,
  authInputClass,
} from "@/components/auth/AuthForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBackend } from "@/lib/supabase/config";

function ResetPasswordInner() {
  const { resetPassword } = useAuth();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const remote = isSupabaseBackend();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(!remote);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setHasRecoverySession(Boolean(data.session));
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remote]);

  const canSubmit = remote ? hasRecoverySession : Boolean(token);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password !== confirm) {
      setError(AUTH_MESSAGES.passwordMismatch);
      return;
    }
    if (!canSubmit) {
      setError(AUTH_MESSAGES.resetInvalid);
      return;
    }
    setSubmitting(true);
    const result = await resetPassword({ token: token || "supabase", password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title="Reset password"
        description="Choose a new password for your Haven account."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Reset password" }]}
      />
      <Card className="p-6">
        {done ? (
          <div className="space-y-4">
            <AuthAlert tone="success">{AUTH_MESSAGES.resetSuccess}</AuthAlert>
            <Button href="/sign-in" className="w-full" size="lg">
              Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <AuthAlert>{error}</AuthAlert>}
            {!canSubmit && (
              <AuthAlert>
                {remote
                  ? "Open the reset link from your email first, then choose a new password."
                  : AUTH_MESSAGES.resetInvalid}
              </AuthAlert>
            )}
            <AuthField label="New password" hint="At least 8 characters">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!canSubmit}
              />
            </AuthField>
            <AuthField label="Confirm new password">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={!canSubmit}
              />
            </AuthField>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting || !canSubmit}
            >
              {submitting ? "Updating…" : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
