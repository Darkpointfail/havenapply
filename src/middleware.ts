import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, isLocale, type Locale } from "@/lib/i18n";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/access-denied",
  "/api/auth",
];

function stripLocale(pathname: string): { locale: Locale; path: string } {
  const parts = pathname.split("/").filter(Boolean);
  const maybe = parts[0] ?? "";
  if (isLocale(maybe)) {
    return { locale: maybe, path: "/" + parts.slice(1).join("/") };
  }
  return { locale: "fr", path: pathname || "/" };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const parts = pathname.split("/").filter(Boolean);
  if (!parts[0] || !isLocale(parts[0])) {
    const url = request.nextUrl.clone();
    url.pathname = `/fr${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const { locale, path } = stripLocale(pathname);
  const isPublic =
    path === "/" ||
    path === "" ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!isPublic && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Coarse role gate from path prefix; fine-grained checks run in server layouts.
  if (sessionToken) {
    if (path.startsWith("/family") || path.startsWith("/staff")) {
      // Defer to server `requireRole` — middleware cannot query Prisma on Edge lightly
      // without splitting runtimes. Cookie presence is enforced here.
    }
  }

  // Prevent signed-out users from hitting dashboards (already handled).
  // Locale passthrough.
  const response = NextResponse.next();
  response.headers.set("x-haven-locale", locale);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};

// Silence unused — locales reserved for future cookie locale preference.
void locales;
