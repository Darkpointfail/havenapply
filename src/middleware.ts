import { NextResponse, type NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_VALUE,
  SITE_ACCESS_PATH,
  isSiteAccessPublicPath,
  safeSiteNextPath,
} from "@/lib/site-access";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSiteAccessPublicPath(pathname)) {
    const unlocked =
      request.cookies.get(SITE_ACCESS_COOKIE)?.value === SITE_ACCESS_COOKIE_VALUE;
    if (!unlocked) {
      const url = request.nextUrl.clone();
      url.pathname = SITE_ACCESS_PATH;
      url.search = "";
      const next = safeSiteNextPath(`${pathname}${request.nextUrl.search}`);
      if (next !== SITE_ACCESS_PATH) {
        url.searchParams.set("next", next);
      }
      return NextResponse.redirect(url);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
