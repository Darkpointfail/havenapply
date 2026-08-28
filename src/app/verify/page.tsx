"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthAlert } from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { resendConfirmation } from "@/lib/auth-store";
import { useT } from "@/lib/i18n/locale";

function VerifyInner() {
  const t = useT();
  const { confirmEmail } = useAuth();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const next = params.get("next") || "/family/dashboard";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError(AUTH_MESSAGES.confirmInvalid);
      return;
    }
    const result = confirmEmail(token);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setEmail(result.data.email);
    setStatus("ok");
  }, [token, confirmEmail]);

  const onResend = () => {
    if (!email || resending) return;
    setResending(true);
    const result = resendConfirmation(email);
    setResending(false);
    if (!result.ok) {
      setResendMsg(result.error);
      return;
    }
    setNewToken(result.data.confirmToken);
    setResendMsg(AUTH_MESSAGES.resendSuccess);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          <p className="mt-4 text-sm text-ink-muted">Confirming your email…</p>
        </div>
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Email confirmed</h1>
        <p className="mt-2 text-ink-muted">{AUTH_MESSAGES.confirmSuccess}</p>
        <Card className="mt-8 space-y-3 p-6">
          <p className="text-sm text-ink-muted">
            {t("After you sign in, you can choose to talk with Haven or fill the profile with forms.")}
          </p>
          <Button
            href={`/sign-in?next=${encodeURIComponent(next.startsWith("/") ? next : "/family/dashboard")}`}
            className="w-full"
            size="lg"
          >
            {t("Sign In")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <XCircle size={28} />
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Confirmation failed</h1>
      <p className="mt-2 text-ink-muted">{error}</p>
      <Card className="mt-8 space-y-3 p-6 text-left">
        {resendMsg && (
          <AuthAlert tone={resendMsg === AUTH_MESSAGES.resendSuccess ? "success" : "error"}>
            {resendMsg}
          </AuthAlert>
        )}
        {email ? (
          <Button type="button" className="w-full" disabled={resending} onClick={onResend}>
            {resending ? "Sending…" : "Resend confirmation email"}
          </Button>
        ) : (
          <Button href="/check-email" className="w-full">
            {t("Request a new link")}
          </Button>
        )}
        <Button href="/sign-in" variant="ghost" className="w-full">
          {t("Back to Sign In")}
        </Button>
        {newToken && email && (
          <div className="pt-2">
            <a
              href={`/verify?token=${encodeURIComponent(newToken)}`}
              className="text-sm font-medium text-brand"
            >
              Open new confirmation link (demo)
            </a>
          </div>
        )}
      </Card>
      <p className="mt-6 text-sm text-ink-muted">
        <Link href="/get-started" className="text-brand">
          {t("Create an account")}
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {

  const t = useT();  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
