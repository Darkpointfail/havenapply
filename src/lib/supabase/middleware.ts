import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  LAST_ACTIVITY_COOKIE,
  SESSION_INACTIVITY_MS,
  secureCookieOptions,
  supabaseCookieOptions,
} from "@/lib/auth-cookies";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            ...supabaseCookieOptions(),
          }),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const lastRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    if (last && now - last > SESSION_INACTIVITY_MS) {
      await supabase.auth.signOut({ scope: "global" });
      supabaseResponse.cookies.set({
        name: LAST_ACTIVITY_COOKIE,
        value: "",
        ...secureCookieOptions({ maxAge: 0 }),
      });
      return supabaseResponse;
    }
    supabaseResponse.cookies.set({
      name: LAST_ACTIVITY_COOKIE,
      value: String(now),
      ...secureCookieOptions({ maxAge: Math.floor(SESSION_INACTIVITY_MS / 1000) }),
    });
  }

  return supabaseResponse;
}
