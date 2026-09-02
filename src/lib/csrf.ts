import { cookies, headers } from "next/headers";

export const CSRF_COOKIE = "haven.csrf";
export const CSRF_FIELD = "csrfToken";
export const CSRF_HEADER = "x-haven-csrf";

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

export function createCsrfTokenValue(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
