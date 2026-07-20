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

function CommunitySignInForm() {
  const { signInCommunity } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("community@demo.haven");
  const [password, setPassword] = useState("HavenDemo1!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await signInCommunity({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.communityStatus !== "verified") {
      router.push("/community/pending");
      return;
    }
    const dest =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : homeForUser(result.data);
    router.push(dest.startsWith("/community") ? dest : "/community/dashboard");
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title="Community sign-in"
        description="Admissions teams sign in to manage applications, availability, and messages."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Community sign-in" }]}
      />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField label="Work email">
            <input
              required
              type="email"
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </AuthField>
          <AuthField label="Password">
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
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New community?{" "}
        <Link href="/get-started?as=community" className="font-medium text-brand">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-ink-faint">
        Demo · community@demo.haven (verified) · pending@demo.haven · HavenDemo1!
      </p>
    </div>
  );
}

export default function CommunitySignInPage() {
  return (
    <Suspense>
      <RedirectIfAuthenticated>
        <CommunitySignInForm />
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
