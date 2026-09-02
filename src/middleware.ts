import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, isLocale, type Locale } from "@/lib/i18n";
import { CSRF_COOKIE, CSRF_HEADER, createCsrfTokenValue } from "@/lib/csrf";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/check-email",
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
    request.cookies.get("haven.session")?.value ||
    request.cookies.get("__Secure-haven.session")?.value;

  if (!isPublic && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const csrf = request.cookies.get(CSRF_COOKIE)?.value || createCsrfTokenValue();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSRF_HEADER, csrf);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-haven-locale", locale);

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, csrf, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};

void locales;
