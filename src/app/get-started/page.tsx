"use client";

import Link from "next/link";
import { CollectionNotice } from "@/components/legal/CollectionNotice";
import { collectionPath, getSignupTermsLabel, privacyPath, termsPath } from "@/content/legal";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useId, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { AuthAlert } from "@/components/auth/AuthForm";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import type { SignupRole } from "@/lib/auth-store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import "./get-started.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

type GetStartedRole = Extract<SignupRole, "family" | "facility">;

const ROLE_OPTIONS: {
  id: GetStartedRole;
  initial: string;
  title: string;
  description: string;
  points: string[];
}[] = [
  {
    id: "family",
    initial: "F",
    title: "Family caregiver",
    description: "For yourself or a loved one looking for a place to live.",
    points: [
      "One admission file, reused everywhere",
      "Residences suggested from the profile",
      "Track every application in one place",
    ],
  },
  {
    id: "facility",
    initial: "R",
    title: "Residence",
    description: "To receive, review, and follow admission applications.",
    points: [
      "Complete, standardized dossiers",
      "An admissions console and waitlist",
      "Availability visible to families",
    ],
  },
];

const FAMILY_FOR = [
  "A parent",
  "My spouse or partner",
  "Myself (the resident)",
  "Another relative",
] as const;

const FACILITY_TYPES = [
  "Private senior residence",
  "Long-term care home (CHSLD)",
  "Intermediate resource",
  "Memory care unit",
] as const;

function roleFromQuery(value: string | null): GetStartedRole | null {
  if (value === "family" || value === "facility") return value;
  if (value === "community") return "facility";
  return null;
}

function ChipGroup({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="gs-field-label mb-2.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={on}
              className="rounded-[20px] border px-3.5 py-2 text-[13.5px] font-medium transition-colors"
              style={{
                background: on ? "var(--gs-green-tint)" : "var(--gs-subtle)",
                borderColor: on ? "var(--gs-green-line)" : "var(--gs-border)",
                color: on ? "var(--gs-green)" : "var(--gs-ink-muted)",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function GetStartedInner() {
  const { signUp, ready } = useAuth();
  const { locale } = useLocale();
  const t = useT();
  const termsLabel = getSignupTermsLabel(locale);
  const router = useRouter();
  const params = useSearchParams();
  const formId = useId();

  const [role, setRole] = useState<GetStartedRole | null>(() => roleFromQuery(params.get("as")));
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
  const [familyFor, setFamilyFor] = useState<string>(FAMILY_FOR[0]);
  const [facilityType, setFacilityType] = useState<string>(FACILITY_TYPES[0]);

  const nextParam = params.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const familyHome = safeNext?.startsWith("/family") ? safeNext : "/family/dashboard";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role || submitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError(t("Passwords do not match."));
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
      organization: role === "facility" ? organization : undefined,
      jobTitle: role === "facility" ? jobTitle || facilityType : undefined,
      phone: role === "facility" ? phone : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const destination = role === "facility" ? "/community/dashboard" : familyHome;
    if (result.pendingConfirmation) {
      router.push(
        `/check-email?email=${encodeURIComponent(result.data.email)}&role=${encodeURIComponent(role)}&next=${encodeURIComponent(destination)}`,
      );
      return;
    }
    if (result.needsManualSignIn) {
      router.push(
        `/sign-in?registered=1&email=${encodeURIComponent(result.data.email)}&next=${encodeURIComponent(destination)}`,
      );
      return;
    }
    router.push(destination);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--gs-canvas,#ECF2F0)]">
        <div className="h-10 w-10 animate-pulse rounded-full" style={{ background: "#E2F3EF" }} />
      </div>
    );
  }

  return (
    <div
      className={cn("gs min-h-[100dvh]", sourceSerif.variable, publicSans.variable)}
      style={{ fontFamily: "var(--font-public-sans), 'Public Sans', system-ui, sans-serif" }}
    >
      <header className="gs-header">
        <div className="gs-header-inner">
          <Logo href="/" size="nav" light className="!ml-0 !translate-y-0" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              compact
              className="!border-white/20 !bg-white/10 !text-white [&_button]:!text-white/75 [&_button[aria-pressed=true]]:!bg-white/20 [&_button[aria-pressed=true]]:!text-white"
            />
            <p className="gs-header-cta text-[14px] text-white/75">
              <span className="gs-header-cta-lead">{t("Already have an account?")} </span>
              <Link
                href="/sign-in"
                className="font-semibold no-underline"
                style={{ color: "var(--gs-green-light)" }}
              >
                {t("Log in")}
              </Link>
            </p>
          </div>
        </div>
      </header>

      <main className="gs-main">
        <p className="gs-eyebrow">{t("Create an account")}</p>
        <h1 className="gs-h1">{t("How will you use HavenApply?")}</h1>
        <p className="gs-lead">
          {t(
            "Choose your role once. It stays linked to your account and shapes what you see when you sign in.",
          )}
        </p>

        <div className="mt-9 grid gap-[18px] md:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const selected = role === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setRole(option.id);
                  setError(null);
                }}
                className="gs-role-card text-left"
                style={{
                  borderColor: selected ? "var(--gs-green)" : "var(--gs-border)",
                  background: selected ? "var(--gs-green-tint-2)" : "var(--gs-surface)",
                }}
              >
                <span
                  className="gs-role-mark"
                  style={{
                    background: selected ? "var(--gs-green)" : "var(--gs-green-tint)",
                    color: selected ? "#fff" : "var(--gs-green)",
                  }}
                >
                  {option.initial}
                </span>
                <h2 className="gs-role-title">{t(option.title)}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--gs-ink-body)]">
                  {t(option.description)}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {option.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 text-[14.5px] leading-relaxed text-[var(--gs-ink-body)]"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--gs-green)" }}
                        aria-hidden
                      />
                      <span>{t(point)}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className="mt-5 border-t pt-4 text-[14px] font-medium"
                  style={{
                    borderColor: "var(--gs-border-faint)",
                    color: selected ? "var(--gs-green)" : "var(--gs-ink-muted)",
                  }}
                >
                  {selected ? t("Selected") : t("Choose this role")}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out",
            role ? "mt-8 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!role}
        >
          <div className="overflow-hidden">
            <div className="gs-form-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="gs-eyebrow !tracking-[0.07em]">{t("Sign up")}</p>
                  <h2 className="gs-h2 mt-1.5">
                    {role === "facility"
                      ? t("Residence account")
                      : t("Family caregiver account")}
                  </h2>
                  <p className="mt-2 max-w-xl text-[14.5px] text-[var(--gs-ink-muted)]">
                    {role === "facility"
                      ? t("Your residence will be verified before its profile goes live.")
                      : t("Your role is saved with your account for future sign-ins.")}
                  </p>
                </div>
                {role ? (
                  <button
                    type="button"
                    className="text-[14px] font-medium text-[var(--gs-ink-muted)] hover:text-[var(--gs-green)]"
                    onClick={() => {
                      setRole(null);
                      setError(null);
                    }}
                  >
                    {t("Change role")}
                  </button>
                ) : null}
              </div>

              <form id={formId} onSubmit={onSubmit} className="mt-7 space-y-5">
                {error ? <AuthAlert>{error}</AuthAlert> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="gs-field-label">{t("First name")}</span>
                    <input
                      required
                      className="gs-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block">
                    <span className="gs-field-label">{t("Last name")}</span>
                    <input
                      required
                      className="gs-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="gs-field-label">{t("Email")}</span>
                  <input
                    required
                    type="email"
                    className="gs-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>

                {role === "family" ? (
                  <ChipGroup
                    label={t("Who is this file for?")}
                    options={FAMILY_FOR.map((o) => t(o))}
                    value={t(familyFor)}
                    onChange={(v) => {
                      const match = FAMILY_FOR.find((o) => t(o) === v) || FAMILY_FOR[0];
                      setFamilyFor(match);
                    }}
                  />
                ) : null}

                {role === "facility" ? (
                  <>
                    <label className="block">
                      <span className="gs-field-label">{t("Residence name")}</span>
                      <input
                        required
                        className="gs-input"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        autoComplete="organization"
                        placeholder={t("e.g. Les Jardins du Fleuve Residence")}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="gs-field-label">{t("Job title")}</span>
                        <input
                          required
                          className="gs-input"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          autoComplete="organization-title"
                          placeholder={t("Director of Admissions")}
                        />
                      </label>
                      <label className="block">
                        <span className="gs-field-label">{t("Phone")}</span>
                        <input
                          type="tel"
                          className="gs-input"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                          placeholder="418 555-0142"
                        />
                      </label>
                    </div>
                    <ChipGroup
                      label={t("Type of residence")}
                      options={FACILITY_TYPES.map((o) => t(o))}
                      value={t(facilityType)}
                      onChange={(v) => {
                        const match = FACILITY_TYPES.find((o) => t(o) === v) || FACILITY_TYPES[0];
                        setFacilityType(match);
                      }}
                    />
                  </>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="gs-field-label">{t("Password")}</span>
                    <input
                      required
                      type="password"
                      minLength={8}
                      className="gs-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <span className="mt-1.5 block text-[12.5px] text-[var(--gs-ink-faint)]">
                      {t("At least 8 characters")}
                    </span>
                  </label>
                  <label className="block">
                    <span className="gs-field-label">{t("Confirm password")}</span>
                    <input
                      required
                      type="password"
                      minLength={8}
                      className="gs-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <CollectionNotice variant="account" className="mb-4" />

                <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--gs-ink-body)]">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4"
                    style={{ accentColor: "var(--gs-green)" }}
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <span>
                    {termsLabel.beforeLinks}
                    <Link href={termsPath(locale)} className="font-medium text-[var(--gs-green)] no-underline">
                      {termsLabel.termsLink}
                    </Link>
                    {termsLabel.mid}
                    <Link href={privacyPath(locale)} className="font-medium text-[var(--gs-green)] no-underline">
                      {termsLabel.privacyLink}
                    </Link>
                    {termsLabel.after}{" "}
                    <Link href={collectionPath(locale)} className="font-medium text-[var(--gs-green)] no-underline">
                      {t("Read the collection notice")}
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !role}
                  className="gs-submit"
                >
                  {submitting ? t("Creating account…") : t("Create my account")}
                </button>

                <p className="text-center text-[13.5px] text-[var(--gs-ink-muted)]">
                  {role === "facility"
                    ? t(
                        "We verify your residence within one business day, then your admissions console is activated.",
                      )
                    : t(
                        "You can start your loved one’s file right away and come back anytime.",
                      )}
                </p>
              </form>
            </div>
          </div>
        </div>

        {!role ? (
          <p className="mt-10 text-center text-[14.5px] text-[var(--gs-ink-muted)]">
            {t("Do you represent a CISSS, CIUSSS, or a residence group?")}{" "}
            <Link href="/contact" className="font-semibold text-[var(--gs-green)] no-underline">
              {t("Write to us")}
            </Link>{" "}
            {t("and we will set up your access.")}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <RedirectIfAuthenticated fallbackHref="/family/dashboard">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center bg-[#ECF2F0]">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#E2F3EF]" />
          </div>
        }
      >
        <GetStartedInner />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
