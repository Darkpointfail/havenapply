"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useId, useRef, useState } from "react";
import { Briefcase, Building2, HeartHandshake } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  authInputClass,
} from "@/components/auth/AuthForm";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import type { SignupRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: {
  id: SignupRole;
  title: string;
  subtitle: string;
  examples?: string[];
  icon: typeof HeartHandshake;
  accent: "brand" | "soft" | "accent";
}[] = [
  {
    id: "family",
    title: "Family",
    subtitle: "Helping a loved one find the right care community.",
    icon: HeartHandshake,
    accent: "brand",
  },
  {
    id: "professional",
    title: "Care Professional",
    subtitle: "Submit and manage applications on behalf of your patients.",
    examples: [
      "Social Worker",
      "Case Manager",
      "Hospital Discharge Planner",
      "Physician",
      "Care Coordinator",
    ],
    icon: Briefcase,
    accent: "soft",
  },
  {
    id: "facility",
    title: "Care Community",
    subtitle: "Receive, review and manage resident applications.",
    examples: [
      "Assisted Living",
      "Nursing Home",
      "Skilled Nursing Facility",
      "Memory Care Community",
    ],
    icon: Building2,
    accent: "accent",
  },
];

function roleFromQuery(value: string | null): SignupRole | null {
  if (value === "family" || value === "professional" || value === "facility") return value;
  if (value === "community") return "facility";
  return null;
}

function accentClasses(accent: "brand" | "soft" | "accent", selected: boolean) {
  if (accent === "brand") {
    return {
      icon: "bg-brand-soft text-brand",
      ring: selected ? "border-brand bg-brand-soft/40 shadow-soft ring-2 ring-brand/25" : "",
    };
  }
  if (accent === "accent") {
    return {
      icon: "bg-accent-soft text-accent",
      ring: selected ? "border-accent bg-accent-soft/50 shadow-soft ring-2 ring-accent/25" : "",
    };
  }
  return {
    icon: "bg-bg-soft text-ink",
    ring: selected ? "border-brand bg-bg-soft shadow-soft ring-2 ring-brand/20" : "",
  };
}

function GetStartedInner() {
  const { signUp, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const formId = useId();
  const formRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<SignupRole | null>(() => roleFromQuery(params.get("as")));
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

  const needsOrg = role === "professional" || role === "facility";
  const selectedMeta = ROLE_OPTIONS.find((o) => o.id === role);

  useEffect(() => {
    if (!role || !formRef.current) return;
    const t = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 180);
    return () => window.clearTimeout(t);
  }, [role]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role || submitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await signUp({
      role,
      firstName,
      lastName,
      email,
      password,
      acceptedTerms,
      organization: needsOrg ? organization : undefined,
      jobTitle: needsOrg ? jobTitle : undefined,
      phone: needsOrg ? phone : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.pendingConfirmation) {
      router.push(
        `/check-email?email=${encodeURIComponent(result.data.email)}&role=${encodeURIComponent(role)}`,
      );
      return;
    }
    router.push(
      role === "facility"
        ? "/community/dashboard"
        : role === "professional"
          ? "/professional/dashboard"
          : "/family/dashboard",
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
    <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <PageHeader
        title="Who are you using HavenApply as?"
        description="Choose your role once, then create your account."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Get Started" }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {ROLE_OPTIONS.map((option) => {
          const selected = role === option.id;
          const Icon = option.icon;
          const accents = accentClasses(option.accent, selected);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setRole(option.id);
                setError(null);
              }}
              aria-pressed={selected}
              className={cn(
                "group flex h-full flex-col rounded-3xl border border-line bg-surface p-5 text-left transition duration-300 ease-out",
                "hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-soft",
                accents.ring,
              )}
            >
              <span
                className={cn(
                  "inline-flex h-12 w-12 items-center justify-center rounded-2xl transition",
                  accents.icon,
                )}
              >
                <Icon size={22} />
              </span>
              <p className="mt-4 text-lg font-semibold tracking-tight text-ink">{option.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{option.subtitle}</p>
              {option.examples ? (
                <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                  {option.examples.join(" · ")}
                </p>
              ) : (
                <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                  Families &amp; loved ones coordinating care.
                </p>
              )}
              <span
                className={cn(
                  "mt-auto pt-4 text-sm font-medium transition",
                  selected ? "text-brand" : "text-ink-muted group-hover:text-brand",
                )}
              >
                {selected ? "Selected" : "Select"}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={formRef}
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out",
          role ? "mt-8 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!role}
      >
        <div className="overflow-hidden">
          <Card className="p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Create account
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">
                  {selectedMeta ? `${selectedMeta.title} registration` : "Registration"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Your role is saved with your account for future access.
                </p>
              </div>
              {role ? (
                <button
                  type="button"
                  className="text-sm text-ink-muted hover:text-brand"
                  onClick={() => {
                    setRole(null);
                    setError(null);
                  }}
                >
                  Change role
                </button>
              ) : null}
            </div>

            <form id={formId} onSubmit={onSubmit} className="mt-6 space-y-4">
              {error ? <AuthAlert>{error}</AuthAlert> : null}

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

              {needsOrg ? (
                <>
                  <AuthField
                    label={role === "facility" ? "Community / organization" : "Organization"}
                  >
                    <input
                      required
                      className={authInputClass}
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      autoComplete="organization"
                      placeholder={
                        role === "facility" ? "Maple Grove Residence" : "City Hospital Case Management"
                      }
                    />
                  </AuthField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField label="Job title">
                      <input
                        required
                        className={authInputClass}
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        autoComplete="organization-title"
                        placeholder={
                          role === "facility" ? "Director of Admissions" : "Social Worker"
                        }
                      />
                    </AuthField>
                    <AuthField label="Phone" hint="Optional">
                      <input
                        type="tel"
                        className={authInputClass}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                      />
                    </AuthField>
                  </div>
                </>
              ) : null}

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
                  I accept the <span className="font-medium text-ink">Terms of Use</span> and{" "}
                  <span className="font-medium text-ink">Privacy Policy</span>.
                </span>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={submitting || !role}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <RedirectIfAuthenticated fallbackHref="/family/dashboard">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
          </div>
        }
      >
        <GetStartedInner />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
