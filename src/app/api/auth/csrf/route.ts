import { cookies } from "next/headers";
import { jsonOk } from "@/lib/family/authz";
import { CSRF_COOKIE, csrfCookieOptions, issueCsrfToken } from "@/lib/security/csrf";
import { isSecureRequest } from "@/lib/security/request-security";

/**
 * Issue a CSRF token before any mutating call.
 * The value is returned so the client can echo it in `x-haven-csrf`; it is
 * useless without the matching cookie, which a cross-site page cannot read.
 */
export async function GET(request: Request) {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  const token = existing ?? issueCsrfToken();
  if (!existing) jar.set(CSRF_COOKIE, token, csrfCookieOptions(isSecureRequest(request)));
  return jsonOk({ csrfToken: token });
}
