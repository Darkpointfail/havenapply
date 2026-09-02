"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth, homeForUser } from "@/lib/auth";
import { isFacilityRole } from "@/lib/auth-store";
import { useT } from "@/lib/i18n/locale";
import "./sign-in.css";

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

function SignInForm() {
  const t = useT();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const registered = params.get("registered") === "1";
  const signedOut = params.get("signedOut") === "1";
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
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
      !dest.startsWith("/get-started")
    ) {
      router.push("/community/pending");
      return;
    }
    router.push(dest);
  };

  const alert = error
    ? {
        className: "si-alert si-alert-error",
        role: "alert" as const,
        text: t("Invalid email or password."),
      }
    : registered
      ? {
          className: "si-alert si-alert-registered",
          role: undefined,
          text: t("Your account is ready. Sign in to open your space."),
        }
      : signedOut
        ? {
            className: "si-alert si-alert-signedout",
            role: undefined,
            text: t("You are signed out."),
          }
        : null;

  return (
    <div
      className={`si ${sourceSerif.variable} ${publicSans.variable}`}
      style={{
        fontFamily: "var(--font-public-sans), 'Public Sans', system-ui, sans-serif",
      }}
    >
      <header className="si-header">
        <div className="si-header-inner">
          <Link href="/" className="si-brand" aria-label={t("HavenApply home")}>
            <Image
              src="/brand/favicon-48-v6.png"
              alt=""
              width={32}
              height={32}
              className="si-brand-mark"
              priority
            />
            <span className="si-brand-name">HavenApply</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <p className="si-header-cta">
              <span className="si-header-cta-lead">{t("Don't have an account?")} </span>
              <Link href="/get-started">{t("Create an account")}</Link>
            </p>
          </div>
        </div>
      </header>

      <main className="si-main">
        <div className="si-copy-col">
          <p className="si-eyebrow">{t("Connection")}</p>
          <h1 className="si-h1">{t("Pick up where you left off")}</h1>
          <p className="si-lead">
            {t("Your file, applications, and residence replies live in your space.")}
          </p>
          <ul className="si-points">
            <li>
              <span className="si-dot" aria-hidden />
              <span>
                {t(
                  "Caregivers: your loved one's file and application tracking.",
                )}
              </span>
            </li>
            <li>
              <span className="si-dot" aria-hidden />
              <span>
                {t(
                  "Facilities: your admissions console and waitlist.",
                )}
              </span>
            </li>
          </ul>
          <p className="si-privacy">
            {t(
              "Your health information is hosted in Québec and is only shared with facilities you apply to.",
            )}
          </p>
        </div>

        <div className="si-form-col">
          <div className="si-card">
            {alert ? (
              <div className={alert.className} role={alert.role}>
                {alert.text}
              </div>
            ) : null}

            <h2 className="si-h2">{t("Log in")}</h2>

            <form onSubmit={onSubmit} className="si-fields">
              <div>
                <label className="si-label" htmlFor="si-email">
                  {t("Email")}
                </label>
                <input
                  id="si-email"
                  required
                  type="email"
                  className="si-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="sophie.levesque@email.ca"
                />
              </div>

              <div>
                <div className="si-label-row">
                  <label className="si-label" htmlFor="si-password">
                    {t("Password")}
                  </label>
                  <Link href="/forgot-password" className="si-forgot">
                    {t("Forgot password?")}
                  </Link>
                </div>
                <input
                  id="si-password"
                  required
                  type="password"
                  className="si-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <label className="si-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>{t("Stay signed in on this device")}</span>
              </label>

              <button type="submit" className="si-submit" disabled={submitting}>
                {submitting ? t("Signing in…") : t("Log in")}
              </button>
            </form>

            <div className="si-card-foot">
              <p className="si-card-foot-cta">
                {t("Don't have an account?")}{" "}
                <Link href="/get-started">{t("Create an account")}</Link>
              </p>
              <p className="si-card-foot-note">
                {t(
                  "Partner facility? Use the same form: your console opens automatically.",
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <RedirectIfAuthenticated fallbackHref="/family/dashboard">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center bg-[#ECF2F0]">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#E2F3EF]" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
