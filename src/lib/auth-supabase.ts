import type { User } from "@supabase/supabase-js";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isValidPassword, normalizeEmail } from "@/lib/auth-crypto";
import { assertPasswordAllowed } from "@/lib/auth-password-policy";
import { resolvePostLoginMfa } from "@/lib/auth-mfa";
import { recordAuthEvent } from "@/lib/auth-events-client";
import type {
  AuthResult,
  CommunityStatus,
  SessionUser,
  SignUpCommunityInput,
  SignUpFamilyInput,
  SignUpWithRoleInput,
  UserRole,
} from "@/lib/auth-store";
import { isFacilityRole, parseUserRole, accountTypeLabel } from "@/lib/auth-store";
import { createClient } from "@/lib/supabase/client";

export type SignUpAuthResult = AuthResult<SessionUser> & {
  pendingConfirmation?: boolean;
  /** Account was created but the browser session could not be opened yet. */
  needsManualSignIn?: boolean;
};

export type SignInAuthResult = AuthResult<SessionUser> & {
  mfa?: "challenge" | "enroll" | "suggest_enroll";
  factorId?: string;
};

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function buildSessionFromInput(
  userId: string,
  input: SignUpWithRoleInput,
  email: string,
  emailConfirmed: boolean,
): SessionUser {
  return {
    id: userId,
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim() || email,
    role: input.role === "facility" ? "facility" : input.role,
    organization: input.organization?.trim(),
    jobTitle: input.jobTitle?.trim(),
    emailConfirmed,
    communityStatus: input.role === "facility" ? "pending" : undefined,
    onboardingCompleted: input.role !== "family",
  };
}

async function signInAfterCreate(
  email: string,
  password: string,
  attempts = 3,
): Promise<{ user: User; errorMessage?: string; errorCode?: string } | { user: null; errorMessage: string; errorCode?: string }> {
  const supabase = createClient();
  let lastMessage: string = AUTH_MESSAGES.generic;
  let lastCode: string | undefined;

  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await new Promise((r) => window.setTimeout(r, 400 * i));
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user && !error) return { user: data.user };
    lastMessage = error?.message || AUTH_MESSAGES.generic;
    lastCode = error?.code;
  }

  return { user: null, errorMessage: lastMessage, errorCode: lastCode };
}

function metaString(meta: Record<string, unknown>, key: string) {
  const v = meta[key];
  return typeof v === "string" ? v : "";
}

function metaBool(meta: Record<string, unknown>, key: string) {
  const v = meta[key];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return false;
}

export function sessionFromSupabaseUser(user: User): SessionUser | null {
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const role = parseUserRole(meta.role);
  if (!role) return null;

  const firstName = metaString(meta, "first_name");
  const lastName = metaString(meta, "last_name");
  const communityStatus = meta.community_status as CommunityStatus | undefined;

  return {
    id: user.id,
    email: user.email || normalizeEmail(metaString(meta, "email") || ""),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || user.email || "Haven user",
    role,
    organization: metaString(meta, "organization") || undefined,
    jobTitle: metaString(meta, "job_title") || undefined,
    emailConfirmed: Boolean(user.email_confirmed_at),
    communityStatus: isFacilityRole(role)
      ? communityStatus === "pending" ||
        communityStatus === "verified" ||
        communityStatus === "rejected"
        ? communityStatus
        : "verified"
      : undefined,
    onboardingCompleted: metaBool(meta, "onboarding_completed"),
  };
}

export async function getSupabaseSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return sessionFromSupabaseUser(data.user);
}

function mapAuthError(message: string, code?: string): string {
  const m = message.toLowerCase();
  const c = (code || "").toLowerCase();

  if (c === "email_address_not_authorized" || m.includes("not authorized")) {
    return AUTH_MESSAGES.emailNotAuthorized;
  }
  if (c === "email_address_invalid" || (m.includes("email address") && m.includes("invalid"))) {
    return AUTH_MESSAGES.emailNotAuthorized;
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists") ||
    c === "email_exists" ||
    c === "user_already_exists"
  ) {
    return AUTH_MESSAGES.emailTaken;
  }
  if (m.includes("invalid login") || m.includes("invalid credentials") || c === "invalid_credentials") {
    return AUTH_MESSAGES.badCredentials;
  }
  if (m.includes("email not confirmed") || c === "email_not_confirmed") {
    return AUTH_MESSAGES.confirmBeforeSignIn;
  }
  if (
    m.includes("password should") ||
    m.includes("password is") ||
    m.includes("weak_password") ||
    m.includes("weak password") ||
    c === "weak_password"
  ) {
    return AUTH_MESSAGES.weakPassword;
  }
  if (m.includes("database error") || m.includes("saving new user")) {
    return "Account could not be created in the database. The profiles trigger may need a fix in Supabase SQL.";
  }
  if (m.includes("redirect") && m.includes("url")) {
    return "Auth redirect URL is not allowed. Add http://localhost:3000/auth/callback in Supabase Auth → URL Configuration.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("email rate")) {
    return "Supabase email rate limit hit (common in local testing). Wait ~1 hour, use a new email, or turn off Confirm email in Supabase Auth → Providers → Email.";
  }
  if (message && message.length < 160) return message;
  return AUTH_MESSAGES.generic;
}

function sessionFromSignup(
  user: User,
  fallback: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organization?: string;
    jobTitle?: string;
    communityStatus?: CommunityStatus;
    onboardingCompleted?: boolean;
  },
): SessionUser {
  const fromMeta = sessionFromSupabaseUser(user);
  if (fromMeta) return fromMeta;
  return {
    id: user.id,
    email: user.email || fallback.email,
    firstName: fallback.firstName,
    lastName: fallback.lastName,
    name: `${fallback.firstName} ${fallback.lastName}`.trim() || fallback.email,
    role: fallback.role,
    organization: fallback.organization,
    jobTitle: fallback.jobTitle,
    emailConfirmed: Boolean(user.email_confirmed_at),
    communityStatus: isFacilityRole(fallback.role)
      ? fallback.communityStatus ?? "verified"
      : undefined,
    onboardingCompleted: Boolean(fallback.onboardingCompleted),
  };
}

export async function signUpWithRoleSupabase(
  input: SignUpWithRoleInput,
): Promise<SignUpAuthResult> {
  if (!input.acceptedTerms) return { ok: false, error: AUTH_MESSAGES.acceptTerms };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  const needsOrg = input.role === "professional" || input.role === "facility";
  if (needsOrg && (!input.organization?.trim() || !input.jobTitle?.trim())) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  if (!isValidPassword(input.password)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }
  const allowed = await assertPasswordAllowed(input.password);
  if (!allowed.ok) return { ok: false, error: allowed.error };

  const email = normalizeEmail(input.email);

  // Prefer server admin signup when available (bypasses default SMTP allowlist in local/dev).
  try {
    const adminRes = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        password: input.password,
        acceptedTerms: input.acceptedTerms,
        organization: input.organization,
        jobTitle: input.jobTitle,
        phone: input.phone,
      }),
    });
    const adminJson = (await adminRes.json()) as {
      ok: boolean;
      error?: string;
      code?: string;
    };

    if (adminRes.ok && adminJson.ok) {
      const signedIn = await signInAfterCreate(email, input.password);
      if (signedIn.user) {
        const sessionUser = sessionFromSignup(signedIn.user, {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role,
          organization: input.organization?.trim(),
          jobTitle: input.jobTitle?.trim(),
          communityStatus: input.role === "facility" ? "pending" : undefined,
          onboardingCompleted: input.role !== "family",
        });
        return { ok: true, data: sessionUser };
      }

      // Account exists in Auth, never show a hard failure that hides a successful signup.
      console.warn(
        "[auth] account created but auto sign-in failed:",
        signedIn.errorMessage,
        signedIn.errorCode,
      );
      return {
        ok: true,
        data: buildSessionFromInput("pending-session", input, email, true),
        needsManualSignIn: true,
      };
    }

    // No service role: keep trying client signup (works once custom SMTP / team email is set).
    // Still surface a clearer hint when admin path is unavailable and client path will likely fail.
    if (adminJson.code === "missing_service_role") {
      // continue to client signUp below
    } else {
      return {
        ok: false,
        error: adminJson.error || AUTH_MESSAGES.generic,
      };
    }
  } catch {
    // Fall through to client signup.
  }

  const supabase = createClient();
  const nextPath =
    input.role === "facility"
      ? "/community/profile?welcome=1"
      : input.role === "professional"
        ? "/professional/dashboard"
        : "/start";

  const metadata: Record<string, unknown> = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    role: input.role,
    account_type: accountTypeLabel(input.role),
    onboarding_completed: input.role !== "family",
  };

  if (needsOrg) {
    metadata.organization = input.organization!.trim();
    metadata.job_title = input.jobTitle!.trim();
    metadata.phone = input.phone?.trim() || "";
  }
  if (input.role === "facility") {
    metadata.community_status = "verified";
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      data: metadata,
    },
  });

  if (error) {
    console.error("[auth] signup failed:", input.role, error.message, error);
    return { ok: false, error: mapAuthError(error.message, error.code) };
  }
  if (!data.user) return { ok: false, error: AUTH_MESSAGES.generic };

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: AUTH_MESSAGES.emailTaken };
  }

  const sessionUser = sessionFromSignup(data.user, {
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role,
    organization: input.organization?.trim(),
    jobTitle: input.jobTitle?.trim(),
    communityStatus: input.role === "facility" ? "pending" : undefined,
    onboardingCompleted: input.role !== "family",
  });

  if (!data.session) {
    return { ok: true, data: sessionUser, pendingConfirmation: true };
  }
  return { ok: true, data: sessionUser };
}

export async function signUpFamilySupabase(
  input: SignUpFamilyInput,
): Promise<SignUpAuthResult> {
  return signUpWithRoleSupabase({
    role: "family",
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    acceptedTerms: input.acceptedTerms,
  });
}

export async function signUpCommunitySupabase(
  input: SignUpCommunityInput,
): Promise<SignUpAuthResult> {
  return signUpWithRoleSupabase({
    role: "facility",
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    organization: input.organization,
    jobTitle: input.jobTitle,
    phone: input.phone,
    acceptedTerms: input.acceptedTerms,
  });
}

export async function signInSupabase(input: {
  email: string;
  password: string;
  expectedRole?: UserRole;
}): Promise<SignInAuthResult> {
  const supabase = createClient();
  const email = normalizeEmail(input.email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) {
    void recordAuthEvent({ type: "sign_in_failure", detail: "bad_credentials" });
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.user) {
    void recordAuthEvent({ type: "sign_in_failure", detail: "missing_user" });
    return { ok: false, error: AUTH_MESSAGES.badCredentials };
  }

  const sessionUser = sessionFromSupabaseUser(data.user);
  if (!sessionUser) {
    await supabase.auth.signOut();
    return { ok: false, error: AUTH_MESSAGES.accessDenied };
  }
  // Accept legacy community accounts when facility is expected (and vice versa)
  const roleMatches =
    !input.expectedRole ||
    sessionUser.role === input.expectedRole ||
    (input.expectedRole === "facility" && sessionUser.role === "community") ||
    (input.expectedRole === "community" && sessionUser.role === "facility");
  if (!roleMatches) {
    await supabase.auth.signOut();
    return { ok: false, error: AUTH_MESSAGES.accessDenied };
  }

  void recordAuthEvent({
    type: "sign_in_success",
    detail: `role:${sessionUser.role}`,
  });

  const mfa = await resolvePostLoginMfa(sessionUser.role);
  if (mfa.status === "challenge") {
    return { ok: true, data: sessionUser, mfa: "challenge", factorId: mfa.factorId };
  }
  if (mfa.status === "enroll") {
    return { ok: true, data: sessionUser, mfa: "enroll" };
  }
  if (mfa.status === "suggest_enroll") {
    return { ok: true, data: sessionUser, mfa: "suggest_enroll" };
  }
  return { ok: true, data: sessionUser };
}

export async function signOutSupabase() {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "global" });
  void recordAuthEvent({ type: "sign_out" });
}

export async function resendConfirmationSupabase(
  email: string,
): Promise<AuthResult<{ email: string; confirmToken: string }>> {
  const supabase = createClient();
  const normalized = normalizeEmail(email);
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true, data: { email: normalized, confirmToken: "" } };
}

export async function requestPasswordResetSupabase(
  email: string,
): Promise<AuthResult<{ email: string; resetToken: string | null; sent: boolean }>> {
  const supabase = createClient();
  const normalized = normalizeEmail(email);
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password`,
  });
  // Always show success to avoid email enumeration
  if (error) {
    // Still return soft success for unknown emails when Supabase is strict
    return { ok: true, data: { email: normalized, resetToken: null, sent: true } };
  }
  return { ok: true, data: { email: normalized, resetToken: null, sent: true } };
}

export async function resetPasswordSupabase(input: {
  token: string;
  password: string;
}): Promise<AuthResult> {
  const policy = await assertPasswordAllowed(input.password);
  if (!policy.ok) return { ok: false, error: policy.error };
  const supabase = createClient();
  // Recovery session is established via /auth/callback; token query is unused for Supabase.
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  // Revoke other sessions after password reset (OWASP).
  await supabase.auth.signOut({ scope: "others" });
  void recordAuthEvent({ type: "password_reset_completed" });
  return { ok: true, data: undefined };
}

export async function completeOnboardingSupabase(
  userId: string,
): Promise<SessionUser | null> {
  const supabase = createClient();
  const { data: current, error: getError } = await supabase.auth.getUser();
  if (getError || !current.user || current.user.id !== userId) return null;

  const meta = { ...(current.user.user_metadata || {}), onboarding_completed: true };
  const { data, error } = await supabase.auth.updateUser({ data: meta });
  if (error || !data.user) return null;
  return sessionFromSupabaseUser(data.user);
}

export async function changePasswordSupabase(
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  const policy = await assertPasswordAllowed(newPassword);
  if (!policy.ok) return { ok: false, error: policy.error };
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) {
    return { ok: false, error: AUTH_MESSAGES.generic };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (reauthError) return { ok: false, error: AUTH_MESSAGES.badCredentials };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  await supabase.auth.signOut({ scope: "others" });
  void recordAuthEvent({
    type: "password_change",
    detail: "password_updated",
  });
  void recordAuthEvent({ type: "session_revoked", detail: "password_change" });
  return { ok: true, data: undefined };
}
