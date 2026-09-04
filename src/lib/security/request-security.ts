/**
 * Whether the current request is carried over a secure channel.
 *
 * `Secure` cookies are dropped by clients on plain HTTP, which would silently
 * break a loopback deployment (and every end-to-end test) while giving no
 * protection there anyway. Production is served over HTTPS, so this resolves
 * to true; the only exception is plain HTTP on a loopback host.
 */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";

  try {
    const url = new URL(request.url);
    if (url.protocol === "https:") return true;
    const host = url.hostname;
    const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
    return !loopback;
  } catch {
    return true;
  }
}
