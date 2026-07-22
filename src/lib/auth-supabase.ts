import type { User } from "@supabase/supabase-js";
import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isValidPassword, normalizeEmail } from "@/lib/auth-crypto";
import type {
  AuthResult,
  CommunityStatus,
  SessionUser,
  SignUpCommunityInput,
  SignUpFamilyInput,
  UserRole,
} from "@/lib/auth-store";
import { createClient } from "@/lib/supabase/client";

export type SignUpAuthResult = AuthResult<SessionUser> & {
  pendingConfirmation?: boolean;
};

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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
  const roleRaw = meta.role;
  const role: UserRole | null =
    roleRaw === "family" || roleRaw === "community" || roleRaw === "internal"
      ? roleRaw
      : null;
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
    communityStatus:
      role === "community"
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

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  ) {
    return AUTH_MESSAGES.emailTaken;
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return AUTH_MESSAGES.badCredentials;
  }
  if (m.includes("email not confirmed")) {
    return AUTH_MESSAGES.confirmBeforeSignIn;
  }
  if (
    m.includes("password should") ||
    m.includes("password is") ||
    m.includes("weak_password") ||
    m.includes("weak password")
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
  // Surface the real message so the user can diagnose (still user-readable)
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
    communityStatus: fallback.role === "community" ? fallback.communityStatus ?? "verified" : undefined,
    onboardingCompleted: Boolean(fallback.onboardingCompleted),
  };
}

export async function signUpFamilySupabase(
  input: SignUpFamilyInput,
): Promise<SignUpAuthResult> {
  if (!input.acceptedTerms) return { ok: false, error: AUTH_MESSAGES.acceptTerms };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  if (!isValidPassword(input.password)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }

  const supabase = createClient();
  const email = normalizeEmail(input.email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=/start`,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        role: "family",
        onboarding_completed: false,
      },
    },
  });

  if (error) {
    console.error("[auth] family signup failed:", error.message, error);
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.user) return { ok: false, error: AUTH_MESSAGES.generic };

  // Duplicate email: Supabase may return a user with empty identities
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: AUTH_MESSAGES.emailTaken };
  }

  const sessionUser = sessionFromSignup(data.user, {
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: "family",
    onboardingCompleted: false,
  });

  if (!data.session) {
    return { ok: true, data: sessionUser, pendingConfirmation: true };
  }
  return { ok: true, data: sessionUser };
}

export async function signUpCommunitySupabase(
  input: SignUpCommunityInput,
): Promise<SignUpAuthResult> {
  if (!input.acceptedTerms) return { ok: false, error: AUTH_MESSAGES.acceptTerms };
  if (
    !input.firstName.trim() ||
    !input.lastName.trim() ||
    !input.email.trim() ||
    !input.organization.trim() ||
    !input.jobTitle.trim()
  ) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  if (!isValidPassword(input.password)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }

  const supabase = createClient();
  const email = normalizeEmail(input.email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=/community/profile?welcome=1`,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        role: "community",
        organization: input.organization.trim(),
        job_title: input.jobTitle.trim(),
        phone: input.phone?.trim() || "",
        community_status: "verified",
        onboarding_completed: true,
      },
    },
  });

  if (error) {
    console.error("[auth] community signup failed:", error.message, error);
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.user) return { ok: false, error: AUTH_MESSAGES.generic };

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: AUTH_MESSAGES.emailTaken };
  }

  const sessionUser = sessionFromSignup(data.user, {
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: "community",
    organization: input.organization.trim(),
    jobTitle: input.jobTitle.trim(),
    communityStatus: "verified",
    onboardingCompleted: true,
  });

  if (!data.session) {
    return { ok: true, data: sessionUser, pendingConfirmation: true };
  }
  return { ok: true, data: sessionUser };
}

export async function signInSupabase(input: {
  email: string;
  password: string;
  expectedRole?: UserRole;
}): Promise<AuthResult<SessionUser>> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(input.email),
    password: input.password,
  });

  if (error) return { ok: false, error: mapAuthError(error.message) };
  if (!data.user) return { ok: false, error: AUTH_MESSAGES.badCredentials };

  const sessionUser = sessionFromSupabaseUser(data.user);
  if (!sessionUser) {
    await supabase.auth.signOut();
    return { ok: false, error: AUTH_MESSAGES.accessDenied };
  }
  if (input.expectedRole && sessionUser.role !== input.expectedRole) {
    await supabase.auth.signOut();
    return { ok: false, error: AUTH_MESSAGES.accessDenied };
  }
  return { ok: true, data: sessionUser };
}

export async function signOutSupabase() {
  const supabase = createClient();
  await supabase.auth.signOut();
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
  if (!isValidPassword(input.password)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }
  const supabase = createClient();
  // Recovery session is established via /auth/callback; token query is unused for Supabase.
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
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
  if (!isValidPassword(newPassword)) {
    return { ok: false, error: AUTH_MESSAGES.weakPassword };
  }
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
  return { ok: true, data: undefined };
}
