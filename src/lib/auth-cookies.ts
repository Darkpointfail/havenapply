/** Shared secure cookie defaults for auth-related cookies. */

export function secureCookieOptions(overrides?: {
  maxAge?: number;
  httpOnly?: boolean;
}): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge?: number;
} {
  return {
    httpOnly: overrides?.httpOnly ?? true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(typeof overrides?.maxAge === "number" ? { maxAge: overrides.maxAge } : {}),
  };
}

/** Supabase SSR cookie option merge (library may still set httpOnly false for PKCE). */
export function supabaseCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Inactivity timeout for authenticated portal sessions (client + middleware hint). */
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
export const LAST_ACTIVITY_COOKIE = "haven_last_activity";
