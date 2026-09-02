import { describe, expect, it, beforeEach } from "vitest";
import { envSchema, resetEnvCache, getEnv } from "@/lib/env";
import { isLocale, createT, locales } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";

const validEnv = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "test-secret-at-least-16-chars",
  DATABASE_URL: "postgresql://haven:haven@localhost:5432/havenapply",
  STORAGE_DRIVER: "minio",
  STORAGE_ENDPOINT: "http://localhost:9000",
  STORAGE_BUCKET: "haven-private",
  STORAGE_ACCESS_KEY_ID: "minioadmin",
  STORAGE_SECRET_ACCESS_KEY: "minioadmin",
  EMAIL_DRIVER: "smtp",
  EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
};

describe("env validation", () => {
  beforeEach(() => resetEnvCache());

  it("accepts a complete local configuration", () => {
    const parsed = envSchema.safeParse(validEnv);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing AUTH_SECRET", () => {
    const parsed = envSchema.safeParse({ ...validEnv, AUTH_SECRET: "short" });
    expect(parsed.success).toBe(false);
  });

  it("getEnv works", () => {
    resetEnvCache();
    const a = getEnv(validEnv as unknown as NodeJS.ProcessEnv);
    expect(a.APP_URL).toBe("http://localhost:3000");
  });
});

describe("i18n", () => {
  it("knows fr and en locales", () => {
    expect(locales).toEqual(["fr", "en"]);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("returns localized sign-in", () => {
    expect(createT("fr")("signIn")).toBe("Connexion");
    expect(createT("en")("signIn")).toBe("Sign in");
  });
});

describe("role dashboards", () => {
  it("routes roles to distinct paths", () => {
    expect(dashboardPathForRole("FAMILY", "fr")).toBe("/fr/family/dashboard");
    expect(dashboardPathForRole("STAFF", "en")).toBe("/en/staff/dashboard");
    expect(dashboardPathForRole("ADMIN", "fr")).toBe("/fr/admin");
  });
});
