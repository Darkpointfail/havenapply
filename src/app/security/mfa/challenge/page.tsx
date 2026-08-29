"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { challengeAndVerifyTotp, listMfaFactors } from "@/lib/auth-mfa";
import { recordAuthEvent } from "@/lib/auth-events-client";
import { safeSiteNextPath } from "@/lib/site-access";

function ChallengeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeSiteNextPath(params.get("next"), "/");
  const [factorId, setFactorId] = useState(params.get("factorId") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (factorId) return;
    void listMfaFactors().then((f) => {
      if (f.totp[0]?.id) setFactorId(f.totp[0].id);
    });
  }, [factorId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId) {
      setError(AUTH_MESSAGES.mfaRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await challengeAndVerifyTotp({ factorId, code });
    setBusy(false);
    if (!res.ok) {
      void recordAuthEvent({ type: "mfa_challenge_failure" });
      setError(AUTH_MESSAGES.mfaInvalid);
      return;
    }
    void recordAuthEvent({ type: "mfa_challenge_success" });
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Authenticator code</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="w-full rounded-2xl border border-line bg-bg px-4 py-3 text-sm"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          required
        />
        <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
          {busy ? "Verifying…" : "Verify"}
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-muted">Loading…</div>}>
      <ChallengeForm />
    </Suspense>
  );
}
