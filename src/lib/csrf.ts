import { cookies, headers } from "next/headers";
import {
  CSRF_COOKIE,
  CSRF_FIELD,
  CSRF_HEADER,
  createCsrfTokenValue,
} from "@/lib/csrf-constants";

export { CSRF_COOKIE, CSRF_FIELD, CSRF_HEADER, createCsrfTokenValue };

/** Prefer middleware-provided header, then cookie. */
export async function getCsrfToken(): Promise<string> {
  const h = await headers();
  const fromHeader = h.get(CSRF_HEADER);
  if (fromHeader) return fromHeader;
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value || "";
}

export async function assertCsrf(formToken: string | null | undefined): Promise<void> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!cookieToken || !formToken || cookieToken !== formToken) {
    throw new Error("CSRF_INVALID");
  }
}
