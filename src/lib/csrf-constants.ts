export const CSRF_COOKIE = "haven.csrf";
export const CSRF_FIELD = "csrfToken";
export const CSRF_HEADER = "x-haven-csrf";

export function createCsrfTokenValue(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
