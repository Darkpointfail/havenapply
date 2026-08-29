"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import {
  challengeAndVerifyTotp,
  enrollTotp,
  listMfaFactors,
} from "@/lib/auth-mfa";
import { recordAuthEvent } from "@/lib/auth-events-client";
import { safeSiteNextPath } from "@/lib/site-access";

function EnrollForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeSiteNextPath(params.get("next"), "/");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startEnroll = async () => {
    setBusy(true);
    setError(null);
    const res = await enrollTotp();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFactorId(res.factorId);
    setQr(res.qrCode);
    setSecret(res.secret);
    void recordAuthEvent({ type: "mfa_enroll" });
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const res = await challengeAndVerifyTotp({ factorId, code });
    setBusy(false);
    if (!res.ok) {
      setError(AUTH_MESSAGES.mfaInvalid);
      void recordAuthEvent({ type: "mfa_challenge_failure" });
      return;
    }
    void recordAuthEvent({ type: "mfa_challenge_success" });
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Set up authenticator</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Multi-factor authentication is required for professional and administrator accounts.
        Scan the QR code with your authenticator app, then enter a 6-digit code.
      </p>

      {!factorId ? (
        <Button className="mt-6" onClick={() => void startEnroll()} disabled={busy}>
          {busy ? "Preparing…" : "Generate QR code"}
        </Button>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          {qr ? (
            qr.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Authenticator QR code" className="mx-auto h-48 w-48" />
            ) : qr.startsWith("<") ? (
              <div
                className="overflow-hidden rounded-2xl border border-line bg-white p-4"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            ) : (
              <p className="text-sm text-ink-muted">QR unavailable — use the manual key.</p>
            )
          ) : null}
          {secret ? (
            <p className="break-all text-xs text-ink-muted">
              Manual key: <span className="font-mono text-ink">{secret}</span>
            </p>
          ) : null}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-2xl border border-line bg-bg px-4 py-3 text-sm"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            required
          />
          <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
            {busy ? "Verifying…" : "Confirm and continue"}
          </Button>
        </form>
      )}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        className="mt-4 text-left text-xs text-ink-muted underline"
        onClick={() => void listMfaFactors()}
      >
        Refresh factors
      </button>
    </div>
  );
}

export default function MfaEnrollPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-muted">Loading…</div>}>
      <EnrollForm />
    </Suspense>
  );
}
