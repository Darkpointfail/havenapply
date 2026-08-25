/**
 * Secrets and environment separation helpers.
 * Never import this module into client components for server-only secrets.
 */

export type AppRuntimeEnv = "development" | "test" | "production";

export function runtimeEnv(): AppRuntimeEnv {
  const explicit = process.env.HAVEN_ENV || process.env.APP_ENV;
  if (explicit === "production" || explicit === "test" || explicit === "development") {
    return explicit;
  }
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

export function isProductionRuntime() {
  return runtimeEnv() === "production";
}

/** True when plaintext HTTP must be refused (production unless explicitly overridden). */
export function mustEnforceTls() {
  if (!isProductionRuntime()) return false;
  return process.env.ALLOW_INSECURE_HTTP !== "1";
}

/**
 * Read a required server secret. In production, missing values throw.
 * Dev/test may fall back only when `devFallback` is provided and non-empty.
 */
export function requireSecret(
  name: string,
  opts?: { devFallback?: string },
): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isProductionRuntime() && opts?.devFallback) return opts.devFallback;
  if (isProductionRuntime()) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return "";
}

export function optionalSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Public analytics id — never a secret, but must not be hardcoded in source. */
export function googleAnalyticsId(): string | undefined {
  return optionalSecret("NEXT_PUBLIC_GA_MEASUREMENT_ID");
}
