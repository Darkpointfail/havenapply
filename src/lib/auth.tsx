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
  signUpCommunityAccount,
  signUpFamilyAccount,
  writeSession,
  type AuthResult,
  type SessionUser,
  type SignUpCommunityInput,
  type SignUpFamilyInput,
  type UserRole,
} from "@/lib/auth-store";

export type { SessionUser, UserRole };
export type AuthUser = SessionUser;
export { homeForRole, homeForUser };

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signUpFamily: (input: SignUpFamilyInput) => Promise<AuthResult<{ email: string; confirmToken: string }>>;
  signUpCommunity: (
    input: SignUpCommunityInput,
  ) => Promise<AuthResult<{ email: string; confirmToken: string }>>;
  signIn: (input: {
    email: string;
    password: string;
    expectedRole?: UserRole;
  }) => Promise<AuthResult<SessionUser>>;
  signOut: () => void;
  confirmEmail: (token: string) => AuthResult<SessionUser>;
  resendConfirmationEmail: (
    email: string,
  ) => AuthResult<{ email: string; confirmToken: string }>;
  forgotPassword: (
    email: string,
  ) => AuthResult<{ email: string; resetToken: string | null; sent: boolean }>;
  resetPassword: (input: { token: string; password: string }) => Promise<AuthResult>;
  completeOnboarding: () => void;
  /** @deprecated */
  signUpFamilyLegacy?: never;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeedAccounts();
      if (cancelled) return;
      setUser(readSession());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUpFamily = useCallback(async (input: SignUpFamilyInput) => {
    return signUpFamilyAccount(input);
  }, []);

  const signUpCommunity = useCallback(async (input: SignUpCommunityInput) => {
    return signUpCommunityAccount(input);
  }, []);

  const signIn = useCallback(
    async (input: { email: string; password: string; expectedRole?: UserRole }) => {
      const result = await signInAccount(input);
      if (result.ok) setUser(result.data);
      return result;
    },
    [],
  );

  const signOut = useCallback(() => {
    signOutAccount();
    setUser(null);
  }, []);

  const confirmEmail = useCallback((token: string) => {
    return confirmEmailToken(token);
  }, []);

  const resendConfirmationEmail = useCallback((email: string) => {
    return resendConfirmation(email);
  }, []);

  const forgotPassword = useCallback((email: string) => {
    return requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (input: { token: string; password: string }) => {
    return resetPasswordWithToken(input);
  }, []);

  const completeOnboarding = useCallback(() => {
    if (!user) return;
    const next = markOnboardingCompleteStore(user.id);
    if (next) setUser(next);
  }, [user]);

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
