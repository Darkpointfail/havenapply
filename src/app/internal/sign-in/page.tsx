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

function InternalSignInForm() {
  const { signInInternal } = useAuth();
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
    const result = await signInInternal({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const dest =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : homeForUser(result.data);
    router.push(dest.startsWith("/internal") ? dest : "/internal/overview");
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <PageHeader
        title="Internal admin"
        description="Haven operations sign-in, platform administration only."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Internal sign-in" }]}
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
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/sign-in" className="text-brand">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function InternalSignInPage() {
  return (
    <Suspense>
      <RedirectIfAuthenticated>
        <InternalSignInForm />
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
