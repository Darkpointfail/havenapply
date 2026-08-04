"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/locale";
import {
  SITE_ACCESS_PASSWORD_MAX_LENGTH,
  safeSiteNextPath,
} from "@/lib/site-access";

function SiteAccessForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeSiteNextPath(params.get("next"));

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        // Fixed copy only — never render the submitted password.
        setError(t("Incorrect password. Try again."));
        setSubmitting(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(t("Something went wrong. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(15,138,138,0.16),transparent),radial-gradient(700px_420px_at_90%_10%,rgba(232,196,160,0.28),transparent),linear-gradient(180deg,#fbfaf7_0%,#f3f1ec_100%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            HavenApply
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            {t("Private preview")}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            {t("Enter the access password to continue to the site.")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[1.75rem] border border-line/80 bg-surface/95 p-6 shadow-sm md:p-7"
        >
          <label className="block">
            <span className="text-sm font-medium text-ink">{t("Password")}</span>
            <div className="relative mt-2">
              <Lock
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                maxLength={SITE_ACCESS_PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.slice(0, SITE_ACCESS_PASSWORD_MAX_LENGTH))
                }
                className="w-full rounded-2xl border border-line bg-bg-soft/80 py-3 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
                placeholder={t("Access password")}
              />
            </div>
          </label>

          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            {submitting ? t("Checking…") : t("Enter site")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SiteAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-ink-muted">
          Loading…
        </div>
      }
    >
      <SiteAccessForm />
    </Suspense>
  );
}
