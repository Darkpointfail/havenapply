/**
 * Server flags for the admissions milestone.
 * See docs/architecture/ADMISSIONS_SERVER_FLOW.md#trust-boundaries
 */

function envFlag(name: string): boolean | null {
  const raw = process.env[name];
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

/**
 * Whether a session cookie may be minted from a client-supplied user object.
 *
 * This is NOT authentication: it trusts the caller. It stays available in
 * development so the prototype keeps working, and is OFF everywhere else until
 * credential verification lands.
 */
export function clientSessionMintEnabled(): boolean {
  const explicit = envFlag("HAVEN_ALLOW_CLIENT_SESSION_MINT");
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "development";
}

/**
 * Kill switch for the server admissions flow.
 * `HAVEN_ADMISSIONS_BACKEND=off` makes the client stop calling the API and the
 * console fall back to its local workspace, without losing server records.
 */
export function admissionsServerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADMISSIONS_BACKEND !== "off";
}

/** Explicit development seeding is refused in production. */
export function admissionsSeedAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}
