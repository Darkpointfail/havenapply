/**
 * Strict environment validation.
 *
 * No secret has a default value. In production a missing or weak secret is a
 * startup error, not a silent fallback.
 */

export type EnvIssue = { name: string; problem: string };

const MIN_SECRET_LENGTH = 32;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function readSecret(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Secret used to sign session tokens.
 * Never falls back to the Supabase service-role key: session integrity must not
 * be coupled to a high-privilege credential.
 */
export function requireSessionSecret(): string {
  const secret = readSecret("HAVEN_SESSION_SECRET");
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;

  if (isProduction()) {
    throw new Error(
      "HAVEN_SESSION_SECRET is missing or shorter than 32 characters. Refusing to sign sessions.",
    );
  }
  // Development only: derived per boot so a leaked repo value is worthless and
  // restarting invalidates every session.
  return devEphemeralSecret();
}

let ephemeral: string | null = null;
function devEphemeralSecret() {
  if (!ephemeral) {
    ephemeral = `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  return ephemeral;
}

/** Site-wide staging gate. Absent value disables the gate rather than using a shared literal. */
export function siteAccessPassword(): string | null {
  return readSecret("SITE_ACCESS_PASSWORD");
}

export function siteAccessSecret(): string | null {
  return readSecret("SITE_ACCESS_SECRET") ?? readSecret("SITE_ACCESS_PASSWORD");
}

/** Validated at boot by instrumentation. Returns the list of problems found. */
export function validateSecurityEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  const sessionSecret = readSecret("HAVEN_SESSION_SECRET");
  if (!sessionSecret) {
    issues.push({ name: "HAVEN_SESSION_SECRET", problem: "missing" });
  } else if (sessionSecret.length < MIN_SECRET_LENGTH) {
    issues.push({
      name: "HAVEN_SESSION_SECRET",
      problem: `shorter than ${MIN_SECRET_LENGTH} characters`,
    });
  }

  if (process.env.NEXT_PUBLIC_AUTH_OPEN_ACCESS === "true") {
    issues.push({
      name: "NEXT_PUBLIC_AUTH_OPEN_ACCESS",
      problem: "open access bypasses authentication and must be false",
    });
  }

  if (process.env.HAVEN_ALLOW_CLIENT_SESSION_MINT === "true") {
    issues.push({
      name: "HAVEN_ALLOW_CLIENT_SESSION_MINT",
      problem: "client session minting must never be enabled",
    });
  }

  if (process.env.NEXT_PUBLIC_DATA_BACKEND === "supabase") {
    if (!readSecret("NEXT_PUBLIC_SUPABASE_URL")) {
      issues.push({ name: "NEXT_PUBLIC_SUPABASE_URL", problem: "missing" });
    }
    if (!readSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      issues.push({ name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", problem: "missing" });
    }
  }

  return issues;
}

/**
 * Throws in production when the environment is unsafe.
 * Only names are reported — never values.
 */
export function assertSecurityEnv() {
  const issues = validateSecurityEnv();
  if (issues.length === 0) return;

  const summary = issues.map((i) => `${i.name}: ${i.problem}`).join("; ");
  if (isProduction()) {
    throw new Error(`Unsafe security environment — ${summary}`);
  }
  console.warn(`[security] non-production environment issues — ${summary}`);
}
