/**
 * Server flags for the admissions milestone.
 * See docs/architecture/ADMISSIONS_SERVER_FLOW.md#trust-boundaries
 */

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
