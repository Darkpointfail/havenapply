/**
 * Non-production policy: no real PHI documents in development / test.
 */

export type AppRuntimeEnv = "development" | "test" | "production";

export function documentRuntimeEnv(): AppRuntimeEnv {
  const explicit = process.env.HAVEN_ENV || process.env.APP_ENV;
  if (explicit === "production" || explicit === "test" || explicit === "development") {
    return explicit;
  }
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

const FIXTURE_NAME_RE = /^(demo|fixture|sample|test)[-_]/i;
const FIXTURE_MAX_BYTES = 512 * 1024; // 512 KB ceiling for non-prod fixtures

/**
 * In development/test, uploads must be explicitly marked as demo fixtures unless
 * ALLOW_REAL_DOCUMENTS_IN_NONPROD=1 (emergency only — never in shared CI).
 */
export function assertNonProdDocumentPolicy(opts: {
  demoFixture: boolean;
  byteSize: number;
  originalName: string;
}): void {
  const env = documentRuntimeEnv();
  if (env === "production") return;
  if (process.env.ALLOW_REAL_DOCUMENTS_IN_NONPROD === "1") return;

  if (!opts.demoFixture) {
    throw new Error(
      "Real documents are forbidden in development/test. Mark upload as demoFixture or use fixtures only.",
    );
  }
  if (opts.byteSize > FIXTURE_MAX_BYTES) {
    throw new Error("Demo fixture exceeds non-production size ceiling");
  }
  const name = opts.originalName || "";
  if (name && !FIXTURE_NAME_RE.test(name.split(/[/\\]/).pop() || name)) {
    throw new Error(
      "Demo fixture original name must start with demo-/fixture-/sample-/test-",
    );
  }
}

export function isProductionDocuments(): boolean {
  return documentRuntimeEnv() === "production";
}
