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

function SignInForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
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
    // Community unverified should not land on portal via next
    if (
      result.data.role === "community" &&
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
      <PageHeader
        title="Sign In"
        description="Access your family, community, or admin portal with your Haven account."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Sign In" }]}
      />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField label="Email">
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
        New here?{" "}
        <Link href="/get-started" className="font-medium text-brand">
          Get Started
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-ink-faint">
        Demo · family@demo.haven / community@demo.haven / admin@demo.haven · HavenDemo1!
      </p>
      <p className="mt-3 text-center text-xs text-ink-faint">
        <Link href="/community/sign-in" className="hover:text-brand">
          Community staff
        </Link>
        {" · "}
        <Link href="/internal/sign-in" className="hover:text-brand">
          Internal admin
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <RedirectIfAuthenticated>
        <SignInForm />
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
