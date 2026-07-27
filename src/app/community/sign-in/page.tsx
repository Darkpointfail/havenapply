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
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth, homeForUser } from "@/lib/auth";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isFacilityRole } from "@/lib/auth-store";
import { useT } from "@/lib/i18n/locale";

function CommunitySignInForm() {
  const t = useT();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const registered = params.get("registered") === "1";
  const signedOut = params.get("signedOut") === "1";
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

    if (!isFacilityRole(result.data.role)) {
      setError("This login is for care communities. Use the family or professional login instead.");
      return;
    }

    if (result.data.communityStatus !== "verified") {
      router.push("/community/pending");
      return;
    }

    const dest =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      next.startsWith("/community") &&
      next !== "/community/sign-in" &&
      next !== "/community/get-started"
        ? next
        : homeForUser(result.data);
    router.push(dest);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title={t("Community sign in")}
        description="Access your HavenApply admissions workspace."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Community sign in" },
        ]}
      />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {signedOut && !error ? (
            <AuthAlert tone="success">You signed out successfully.</AuthAlert>
          ) : null}
          {registered && !error ? (
            <AuthAlert tone="success">{AUTH_MESSAGES.accountCreatedSignIn}</AuthAlert>
          ) : null}
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField label={t("Work email")}>
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
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New community?{" "}
        <Link href="/community/get-started" className="font-medium text-brand">
          {t("Get started")}
        </Link>
        <span className="mx-2 text-ink-faint">·</span>
        <Link href="/sign-in" className="font-medium text-brand">
          {t("Family / other login")}
        </Link>
      </p>
    </div>
  );
}

export default function CommunitySignInPage() {

  const t = useT();  return (
    <RedirectIfAuthenticated fallbackHref="/community/dashboard">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          </div>
        }
      >
        <CommunitySignInForm />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
