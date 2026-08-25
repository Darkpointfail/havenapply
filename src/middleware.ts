import { NextResponse, type NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_PATH,
  isSiteAccessPublicPath,
  isValidSiteAccessCookie,
  safeSiteNextPath,
  siteAccessGateDisabled,
} from "@/lib/site-access";
import { applySecurityHeaders, enforceHttpsOrRedirect } from "@/lib/security/tls";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const httpsRedirect = enforceHttpsOrRedirect(request);
  if (httpsRedirect) return applySecurityHeaders(httpsRedirect);

  const { pathname } = request.nextUrl;

  if (!siteAccessGateDisabled() && !isSiteAccessPublicPath(pathname)) {
    const unlocked = await isValidSiteAccessCookie(
      request.cookies.get(SITE_ACCESS_COOKIE)?.value,
    );
    if (!unlocked) {
      const url = request.nextUrl.clone();
      url.pathname = SITE_ACCESS_PATH;
      url.search = "";
      const next = safeSiteNextPath(`${pathname}${request.nextUrl.search}`);
      if (next !== SITE_ACCESS_PATH) {
        url.searchParams.set("next", next);
      }
      return applySecurityHeaders(NextResponse.redirect(url));
    }
  }

  const response = await updateSession(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
