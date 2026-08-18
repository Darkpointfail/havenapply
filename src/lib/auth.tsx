"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  confirmEmailToken,
  ensureSeedAccounts,
  homeForRole,
  homeForUser,
  markOnboardingComplete as markOnboardingCompleteStore,
  readSession,
  requestPasswordReset,
  resendConfirmation,
  resetPasswordWithToken,
  signInAccount,
  signOutAccount,
  signUpWithRoleAccount,
  writeSession,
  type AuthResult,
  type SessionUser,
  type SignUpCommunityInput,
  type SignUpFamilyInput,
  type SignUpWithRoleInput,
  type UserRole,
  isFacilityRole,
} from "@/lib/auth-store";
import {
  AUTH_OPEN_ACCESS,
  DEMO_COMMUNITY_USER,
  DEMO_FAMILY_USER,
  DEMO_PROFESSIONAL_USER,
  clearOpenAccessSessions,
  demoUserForPath,
  hasOpenFamilySession,
  isCommunityPortalPath,
  isFamilyAccountRequiredPath,
  isFamilyPortalPath,
  isProfessionalPortalPath,
  markOpenCommunitySession,
  markOpenFamilySession,
  markOpenProfessionalSession,
} from "@/lib/auth-open-access";
import {
  completeOnboardingSupabase,
  getSupabaseSessionUser,
  requestPasswordResetSupabase,
  resendConfirmationSupabase,
  resetPasswordSupabase,
  sessionFromSupabaseUser,
  signInSupabase,
  signOutSupabase,
  signUpWithRoleSupabase,
  type SignUpAuthResult,
} from "@/lib/auth-supabase";
import { mfaRedirectPath } from "@/lib/auth-mfa-redirect";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBackend } from "@/lib/supabase/config";

export type { SessionUser, UserRole };
export type AuthUser = SessionUser;
export { homeForRole, homeForUser };

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signUpFamily: (input: SignUpFamilyInput) => Promise<SignUpAuthResult>;
  signUpCommunity: (input: SignUpCommunityInput) => Promise<SignUpAuthResult>;
  signUp: (input: SignUpWithRoleInput) => Promise<SignUpAuthResult>;
  signIn: (input: {
    email: string;
    password: string;
    expectedRole?: UserRole;
    nextPath?: string;
  }) => Promise<AuthResult<SessionUser>>;
  signOut: () => void;
  confirmEmail: (token: string) => AuthResult<SessionUser>;
  resendConfirmationEmail: (
    email: string,
  ) => Promise<AuthResult<{ email: string; confirmToken: string }>>;
  forgotPassword: (
    email: string,
  ) => Promise<AuthResult<{ email: string; resetToken: string | null; sent: boolean }>>;
  resetPassword: (input: { token: string; password: string }) => Promise<AuthResult>;
  completeOnboarding: () => void;
  signInFamily: (input: { email: string; password: string }) => Promise<AuthResult<SessionUser>>;
  signInCommunity: (input: {
    email: string;
    password: string;
  }) => Promise<AuthResult<SessionUser>>;
  signInInternal: (input: { email: string; password: string }) => Promise<AuthResult<SessionUser>>;
  signInResidence: (input: {
    email: string;
    password: string;
  }) => Promise<AuthResult<SessionUser>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useRemoteAuth() {
  return isSupabaseBackend();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  // Path-only on first paint so SSR and client HTML match (no sessionStorage).
  const [user, setUser] = useState<SessionUser | null>(() =>
    AUTH_OPEN_ACCESS ? demoUserForPath(pathname) : null,
  );
  const [ready, setReady] = useState(!AUTH_OPEN_ACCESS);
  const remote = useRemoteAuth();

  useEffect(() => {
    if (!AUTH_OPEN_ACCESS) return;

    // Do not mint a demo family session just by opening apply/messages while logged out.
    if (isFamilyAccountRequiredPath(pathname) && !hasOpenFamilySession()) {
      setUser(null);
      setReady(true);
      return;
    }

    if (isProfessionalPortalPath(pathname)) markOpenProfessionalSession();
    else if (isFamilyPortalPath(pathname)) markOpenFamilySession();
    else if (isCommunityPortalPath(pathname)) markOpenCommunitySession();
    setUser(demoUserForPath(pathname, { useStoredSession: true }));
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    if (AUTH_OPEN_ACCESS) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      if (remote) {
        try {
          const sessionUser = await getSupabaseSessionUser();
          if (!cancelled) setUser(sessionUser);
        } catch {
          if (!cancelled) setUser(null);
        }
        if (!cancelled) setReady(true);

        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          setUser(session?.user ? sessionFromSupabaseUser(session.user) : null);
        });
        unsubscribe = () => subscription.unsubscribe();
        return;
      }

      await ensureSeedAccounts();
      if (cancelled) return;
      setUser(readSession());
      setReady(true);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [remote]);

  const signUp = useCallback(
    async (input: SignUpWithRoleInput) => {
      // Always persist real accounts (and role metadata) even when open-access demo is on.
      if (remote) {
        const result = await signUpWithRoleSupabase(input);
        if (result.ok && !result.pendingConfirmation && !result.needsManualSignIn) {
          setUser(result.data);
        }
        return result;
      }
      const result = await signUpWithRoleAccount(input);
      if (result.ok) setUser(result.data);
      return result;
    },
    [remote],
  );

  const signUpFamily = useCallback(
    async (input: SignUpFamilyInput) =>
      signUp({
        role: "family",
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: input.password,
        acceptedTerms: input.acceptedTerms,
      }),
    [signUp],
  );

  const signUpCommunity = useCallback(
    async (input: SignUpCommunityInput) =>
      signUp({
        role: "facility",
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: input.password,
        organization: input.organization,
        jobTitle: input.jobTitle,
        phone: input.phone,
        acceptedTerms: input.acceptedTerms,
      }),
    [signUp],
  );

  const signIn = useCallback(
    async (input: {
      email: string;
      password: string;
      expectedRole?: UserRole;
      nextPath?: string;
    }) => {
      // Prefer real auth when Supabase is configured, even if open-access demo is on.
      if (remote) {
        const result = await signInSupabase(input);
        if (result.ok) {
          setUser(result.data);
          if (result.mfa === "challenge" || result.mfa === "enroll") {
            const path = mfaRedirectPath(result.mfa, {
              factorId: result.factorId,
              next: input.nextPath || homeForUser(result.data),
            });
            if (typeof window !== "undefined") window.location.assign(path);
          }
        }
        return result;
      }
      if (AUTH_OPEN_ACCESS) {
        const expected = input.expectedRole;
        const demo =
          expected && isFacilityRole(expected)
            ? DEMO_COMMUNITY_USER
            : expected === "professional"
              ? DEMO_PROFESSIONAL_USER
              : expected === "internal"
                ? null
                : DEMO_FAMILY_USER;
        if (!demo) {
          return {
            ok: false as const,
            error: "Open-access demo is not available for this role.",
          };
        }
        if (demo.role === "professional") markOpenProfessionalSession();
        else if (isFacilityRole(demo.role)) markOpenCommunitySession();
        else markOpenFamilySession();
        setUser(demo);
        return { ok: true as const, data: demo };
      }
      const result = await signInAccount(input);
      if (result.ok) setUser(result.data);
      return result;
    },
    [remote],
  );

  const signOut = useCallback(() => {
    clearOpenAccessSessions();
    setUser(null);
    if (AUTH_OPEN_ACCESS) return;
    if (remote) {
      void signOutSupabase();
      return;
    }
    signOutAccount();
  }, [remote]);

  const confirmEmail = useCallback((token: string) => {
    return confirmEmailToken(token);
  }, []);

  const resendConfirmationEmail = useCallback(
    async (email: string) => {
      if (remote) return resendConfirmationSupabase(email);
      return resendConfirmation(email);
    },
    [remote],
  );

  const forgotPassword = useCallback(
    async (email: string) => {
      if (remote) return requestPasswordResetSupabase(email);
      return requestPasswordReset(email);
    },
    [remote],
  );

  const resetPassword = useCallback(
    async (input: { token: string; password: string }) => {
      if (remote) return resetPasswordSupabase(input);
      return resetPasswordWithToken(input);
    },
    [remote],
  );

  const completeOnboarding = useCallback(() => {
    if (!user) return;
    if (remote) {
      void completeOnboardingSupabase(user.id).then((next) => {
        if (next) setUser(next);
      });
      return;
    }
    const next = markOnboardingCompleteStore(user.id);
    if (next) setUser(next);
  }, [user, remote]);

  const signInFamily = useCallback(
    (input: { email: string; password: string }) =>
      signIn({ ...input, expectedRole: "family" }),
    [signIn],
  );

  const signInCommunity = useCallback(
    (input: { email: string; password: string }) =>
      signIn({ ...input, expectedRole: "community" }),
    [signIn],
  );

  const signInInternal = useCallback(
    (input: { email: string; password: string }) =>
      signIn({ ...input, expectedRole: "internal" }),
    [signIn],
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      signUpFamily,
      signUpCommunity,
      signUp,
      signIn,
      signOut,
      confirmEmail,
      resendConfirmationEmail,
      forgotPassword,
      resetPassword,
      completeOnboarding,
      signInFamily,
      signInCommunity,
      signInInternal,
      signInResidence: signInCommunity,
    }),
    [
      user,
      ready,
      signUpFamily,
      signUpCommunity,
      signUp,
      signIn,
      signOut,
      confirmEmail,
      resendConfirmationEmail,
      forgotPassword,
      resetPassword,
      completeOnboarding,
      signInFamily,
      signInCommunity,
      signInInternal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Sync session user into state after external store mutation (e.g. verify then auto sign-in). */
export function setSessionUser(user: SessionUser | null) {
  writeSession(user);
}
