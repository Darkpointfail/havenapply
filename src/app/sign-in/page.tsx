"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  AuthAlert,
  AuthField,
  authInputClass,
} from "@/components/auth/AuthForm";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { Logo } from "@/components/brand/Logo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth, homeForUser } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isFacilityRole } from "@/lib/auth-store";
import { useT } from "@/lib/i18n/locale";

function SignInForm() {
  const t = useT();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const registered = params.get("registered") === "1";
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await signIn({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const dest =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : homeForUser(result.data);
    if (
      isFacilityRole(result.data.role) &&
      result.data.communityStatus !== "verified" &&
      dest.startsWith("/community/") &&
      dest !== "/community/pending" &&
      dest !== "/community/sign-in"
    ) {
      router.push("/community/pending");
      return;
    }
    router.push(dest);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <div className="mb-6">
        <Logo href="/" size="nav" className="!ml-0 !translate-y-0" />
      </div>
      <PageHeader
        title={t("Log in")}
        description="Access your HavenApply account."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Log in" }]}
      />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {registered && !error ? (
            <AuthAlert tone="success">{AUTH_MESSAGES.accountCreatedSignIn}</AuthAlert>
          ) : null}
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField label={t("Email")}>
            <input
              required
              type="email"
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </AuthField>
          <AuthField label={t("Password")}>
            <input
              required
              type="password"
              className={authInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </AuthField>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-brand">
              {t("Forgot password?")}
            </Link>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Log in"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/get-started" className="font-medium text-brand">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {

  const t = useT();  return (
    <RedirectIfAuthenticated fallbackHref="/family/dashboard">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
