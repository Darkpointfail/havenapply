"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Building2, HeartHandshake } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  DemoInbox,
  authInputClass,
} from "@/components/auth/AuthForm";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Path = "choose" | "family" | "community";

function GetStartedInner() {
  const { signUpFamily, signUpCommunity, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("as");
  const [path, setPath] = useState<Path>(
    preset === "community" ? "community" : preset === "family" ? "family" : "choose",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [demoToken, setDemoToken] = useState<string | null>(null);

  const onFamilySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await signUpFamily({
      firstName,
      lastName,
      email,
      password,
      acceptedTerms,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDemoToken(result.data.confirmToken);
    router.push(
      `/check-email?email=${encodeURIComponent(result.data.email)}&token=${encodeURIComponent(result.data.confirmToken)}&role=family`,
    );
  };

  const onCommunitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await signUpCommunity({
      firstName,
      lastName,
      email,
      password,
      organization,
      jobTitle,
      phone,
      acceptedTerms,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDemoToken(result.data.confirmToken);
    router.push(
      `/check-email?email=${encodeURIComponent(result.data.email)}&token=${encodeURIComponent(result.data.confirmToken)}&role=community`,
    );
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12 md:py-16">
      <PageHeader
        title="Get Started"
        description="Create your Haven account — for families seeking care, or communities managing admissions."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Get Started" }]}
      />

      {path === "choose" && (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setPath("family")}
            className="rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-brand hover:shadow-soft"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <HeartHandshake size={20} />
            </span>
            <p className="mt-3 text-lg font-semibold">I’m looking for care for someone</p>
            <p className="mt-1 text-sm text-ink-muted">
              Build one senior profile and apply to multiple communities.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPath("community")}
            className="rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-brand hover:shadow-soft"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Building2 size={20} />
            </span>
            <p className="mt-3 text-lg font-semibold">I represent a senior living community</p>
            <p className="mt-1 text-sm text-ink-muted">
              Receive applications, manage admissions, and message families.
            </p>
          </button>
        </div>
      )}

      {path === "family" && (
        <Card className="p-6">
          <button
            type="button"
            className="mb-4 text-sm text-ink-muted hover:text-brand"
            onClick={() => {
              setPath("choose");
              setError(null);
            }}
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold">Family account</h2>
          <p className="mt-1 text-sm text-ink-muted">Optimized around one primary senior for the MVP.</p>
          <form onSubmit={onFamilySubmit} className="mt-6 space-y-4">
            {error && <AuthAlert>{error}</AuthAlert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField label="First name">
                <input
                  required
                  className={authInputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </AuthField>
              <AuthField label="Last name">
                <input
                  required
                  className={authInputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </AuthField>
            </div>
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
            <AuthField label="Password" hint="At least 8 characters">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </AuthField>
            <AuthField label="Confirm password">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </AuthField>
            <label className="flex items-start gap-3 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I accept the{" "}
                <span className="font-medium text-ink">Terms of Use</span> and{" "}
                <span className="font-medium text-ink">Privacy Policy</span>.
              </span>
            </label>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Creating account…" : "Create family account"}
            </Button>
          </form>
        </Card>
      )}

      {path === "community" && (
        <Card className="p-6">
          <button
            type="button"
            className="mb-4 text-sm text-ink-muted hover:text-brand"
            onClick={() => {
              setPath("choose");
              setError(null);
            }}
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold">Community account</h2>
          <p className="mt-1 text-sm text-ink-muted">
            After email confirmation, Haven verifies your organization before portal access.
          </p>
          <form onSubmit={onCommunitySubmit} className="mt-6 space-y-4">
            {error && <AuthAlert>{error}</AuthAlert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField label="First name">
                <input
                  required
                  className={authInputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </AuthField>
              <AuthField label="Last name">
                <input
                  required
                  className={authInputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </AuthField>
            </div>
            <AuthField label="Work email">
              <input
                required
                type="email"
                className={authInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </AuthField>
            <AuthField label="Job title">
              <input
                required
                className={authInputClass}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Admissions Director"
              />
            </AuthField>
            <AuthField label="Community / facility name">
              <input
                required
                className={authInputClass}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </AuthField>
            <AuthField label="Phone (optional)">
              <input
                type="tel"
                className={authInputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </AuthField>
            <AuthField label="Password" hint="At least 8 characters">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </AuthField>
            <AuthField label="Confirm password">
              <input
                required
                type="password"
                minLength={8}
                className={authInputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </AuthField>
            <label className="flex items-start gap-3 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I accept the{" "}
                <span className="font-medium text-ink">Terms of Use</span> and{" "}
                <span className="font-medium text-ink">Privacy Policy</span>, and confirm I am
                authorized to represent this community.
              </span>
            </label>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Creating account…" : "Create community account"}
            </Button>
          </form>
        </Card>
      )}

      {demoToken && path !== "choose" && (
        <DemoInbox
          email={email}
          confirmHref={`/verify?token=${encodeURIComponent(demoToken)}`}
        />
      )}

      <p className={cn("mt-6 text-center text-sm text-ink-muted")}>
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense>
      <RedirectIfAuthenticated>
        <GetStartedInner />
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
