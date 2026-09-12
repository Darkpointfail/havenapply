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
import {
  confirmEmailToken,
  homeForRole,
  homeForUser,
  markOnboardingComplete as markOnboardingCompleteStore,
  parseUserRole,
  requestPasswordReset,
  resendConfirmation,
  resetPasswordWithToken,
  signInAccount,
  signOutAccount,
  writeSession,
  updateSessionProfile,
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
  verifyEmailCodeSupabase,
  type SignUpAuthResult,
} from "@/lib/auth-supabase";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { fetchServerIdentity, serverRegister, serverSignIn, serverSignOut } from "@/lib/family/client-api";
import { AUTH_MESSAGES } from "@/lib/auth-messages";

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
  }) => Promise<AuthResult<SessionUser>>;
  signOut: () => void;
  confirmEmail: (token: string) => AuthResult<SessionUser>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthResult<SessionUser>>;
  resendConfirmationEmail: (
    email: string,
  ) => Promise<AuthResult<{ email: string; confirmToken: string }>>;
  forgotPassword: (
    email: string,
  ) => Promise<AuthResult<{ email: string; resetToken: string | null; sent: boolean }>>;
  resetPassword: (input: { token: string; password: string }) => Promise<AuthResult>;
  completeOnboarding: () => void;
  updateProfile: (patch: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    phone?: string;
  }) => SessionUser | null;
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
  // Never auto-mint a portal session on first paint — user must sign in.
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const remote = useRemoteAuth();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      if (remote) {
        try {
          const sessionUser = await getSupabaseSessionUser();
          if (!cancelled) {
            setUser(sessionUser);
          }
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

      // Local backend: the server owns identity. localStorage is never
      // consulted for who the user is, their role, or their scope.
      const identity = await fetchServerIdentity();
      if (cancelled) return;
      if (!identity) {
        setUser(null);
        setReady(true);
        return;
      }
      const role = parseUserRole(identity.role);
      const [firstName = "", ...rest] = (identity.name || identity.email).split(" ");
      setUser(
        role
          ? {
              id: identity.id,
              email: identity.email,
              firstName,
              lastName: rest.join(" "),
              name: identity.name || identity.email,
              role,
              emailConfirmed: true,
              communityStatus: isFacilityRole(role) ? "verified" : undefined,
              onboardingCompleted: true,
            }
          : null,
      );
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
        if (result.ok && !result.pendingConfirmation) {
          setUser(result.data);
        }
        return result;
      }
      // Local backend: create the credential server-side (the same store
      // sign-in reads from) instead of the old client-only prototype store,
      // then sign in immediately to establish a real server session.
      const registered = await serverRegister({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
      });
      if (!registered.ok) {
        return { ok: false as const, error: registered.error };
      }
      const server = await serverSignIn({
        email: input.email,
        password: input.password,
        expectedRole: input.role,
      });
      if (!server.ok) return { ok: false as const, error: server.error };

      const identity = await fetchServerIdentity();
      if (!identity) {
        await serverSignOut();
        return { ok: false as const, error: AUTH_MESSAGES.accessDenied };
      }
      const signedInRole = parseUserRole(identity.role);
      if (!signedInRole) {
        await serverSignOut();
        return { ok: false as const, error: AUTH_MESSAGES.accessDenied };
      }
      const [signedInFirstName = "", ...signedInRest] = (identity.name || identity.email).split(
        " ",
      );
      const signedIn: SessionUser = {
        id: identity.id,
        email: identity.email,
        firstName: signedInFirstName,
        lastName: signedInRest.join(" "),
        name: identity.name || identity.email,
        role: signedInRole,
        emailConfirmed: true,
        onboardingCompleted: true,
        // Local backend has no community review workflow yet: a facility
        // account is auto-verified, matching the old prototype behavior.
        communityStatus: isFacilityRole(signedInRole) ? "verified" : undefined,
      };
      // Keep the local profile store in step when it knows this account.
      void signInAccount(input);
      setUser(signedIn);
      return { ok: true as const, data: signedIn };
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
    async (input: { email: string; password: string; expectedRole?: UserRole }) => {
      // Prefer real auth when Supabase is configured, even if open-access demo is on.
      if (remote) {
        const result = await signInSupabase(input);
        if (result.ok) {
          setUser(result.data);
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
      // Local backend: the server verifies the password and issues the session.
      const server = await serverSignIn({
        email: input.email,
        password: input.password,
        expectedRole: input.expectedRole,
      });
      if (!server.ok) return { ok: false as const, error: server.error };

      // The session now exists server-side, so the signed-in user must come
      // from the server too: a stale prototype account cannot contradict it.
      const identity = await fetchServerIdentity();
      if (!identity) {
        await serverSignOut();
        return { ok: false as const, error: AUTH_MESSAGES.accessDenied };
      }
      const role = parseUserRole(identity.role);
      if (!role) {
        await serverSignOut();
        return { ok: false as const, error: AUTH_MESSAGES.accessDenied };
      }
      const [firstName = "", ...rest] = (identity.name || identity.email).split(" ");
      const signedIn: SessionUser = {
        id: identity.id,
        email: identity.email,
        firstName,
        lastName: rest.join(" "),
        name: identity.name || identity.email,
        role,
        emailConfirmed: true,
        communityStatus: isFacilityRole(role) ? "verified" : undefined,
        onboardingCompleted: true,
      };
      // Keep the local profile store in step when it knows this account.
      void signInAccount(input);
      setUser(signedIn);
      return { ok: true as const, data: signedIn };
    },
    [remote],
  );

  const signOut = useCallback(() => {
    clearOpenAccessSessions();
    setUser(null);
    void serverSignOut();
    if (remote) {
      void signOutSupabase();
      return;
    }
    if (AUTH_OPEN_ACCESS) return;
    signOutAccount();
  }, [remote]);

  const confirmEmail = useCallback((token: string) => {
    return confirmEmailToken(token);
  }, []);

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      // Local backend never produces pendingConfirmation (signUp() above
      // always signs in immediately there), so this is never reachable
      // from the local flow — guard anyway rather than assume the caller
      // checked isSupabaseBackend() first.
      if (!remote) return { ok: false as const, error: AUTH_MESSAGES.generic };
      const result = await verifyEmailCodeSupabase(email, code);
      if (result.ok) setUser(result.data);
      return result;
    },
    [remote],
  );

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

  const updateProfile = useCallback(
    (patch: { firstName?: string; lastName?: string; jobTitle?: string; phone?: string }) => {
      if (!user) return null;
      // Demo / open-access: update in-memory session immediately.
      if (AUTH_OPEN_ACCESS) {
        const firstName = (patch.firstName ?? user.firstName).trim();
        const lastName = (patch.lastName ?? user.lastName).trim();
        const jobTitle =
          patch.jobTitle !== undefined ? patch.jobTitle.trim() || undefined : user.jobTitle;
        const phone = patch.phone !== undefined ? patch.phone.trim() || undefined : user.phone;
        const next: SessionUser = {
          ...user,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim() || user.name,
          jobTitle,
          phone,
        };
        writeSession(next);
        setUser(next);
        return next;
      }
      const next = updateSessionProfile(user.id, patch);
      if (next) setUser(next);
      return next;
    },
    [user],
  );

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
      verifyEmailCode,
      resendConfirmationEmail,
      forgotPassword,
      resetPassword,
      completeOnboarding,
      updateProfile,
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
      verifyEmailCode,
      resendConfirmationEmail,
      forgotPassword,
      resetPassword,
      completeOnboarding,
      updateProfile,
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
