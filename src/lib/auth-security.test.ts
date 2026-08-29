/**
 * OWASP auth hardening unit tests.
 * Run: npm run test:auth-security
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

describe("password policy", async () => {
  const { isValidPassword, assertPasswordAllowed } = await import(
    "@/lib/auth-password-policy"
  );

  it("rejects short or simple passwords", () => {
    assert.equal(isValidPassword("short"), false);
    assert.equal(isValidPassword("alllowercase12"), false);
    assert.equal(isValidPassword("ALLUPPERCASE12"), false);
    assert.equal(isValidPassword("NoDigitsHere!!"), false);
    assert.equal(isValidPassword("GoodPass1234"), true);
  });

  it("assertPasswordAllowed returns structured errors", async () => {
    const weak = await assertPasswordAllowed("abc");
    assert.equal(weak.ok, false);
  });
});

describe("PBKDF2 local hashing", async () => {
  const { hashPassword, verifyPassword, createSalt } = await import("@/lib/auth-crypto");

  it("hashes and verifies with pbkdf2 prefix", async () => {
    const salt = createSalt();
    const hash = await hashPassword("GoodPass1234", salt);
    assert.match(hash, /^pbkdf2-sha256\$210000\$/);
    assert.equal(await verifyPassword("GoodPass1234", salt, hash), true);
    assert.equal(await verifyPassword("WrongPass1234", salt, hash), false);
  });

  it("still verifies legacy sha256 hashes", async () => {
    const salt = "abcd";
    const data = new TextEncoder().encode(`${salt}:legacy`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const legacy = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    assert.equal(await verifyPassword("legacy", salt, legacy), true);
  });
});

describe("rate limit", async () => {
  const { rateLimit, resetRateLimits } = await import("@/lib/auth-rate-limit");

  beforeEach(() => resetRateLimits());

  it("blocks after limit", () => {
    const key = "test:ip";
    for (let i = 0; i < 3; i++) {
      const r = rateLimit({ key, limit: 3, windowMs: 60_000 });
      assert.equal(r.allowed, true);
    }
    const blocked = rateLimit({ key, limit: 3, windowMs: 60_000 });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec >= 1);
  });
});

describe("CSRF origin checks", async () => {
  const { assertSameOriginMutation } = await import("@/lib/auth-csrf");

  it("allows GET", () => {
    const r = assertSameOriginMutation(new Request("http://localhost:3000/api/x"));
    assert.equal(r.ok, true);
  });

  it("rejects POST without origin", () => {
    const r = assertSameOriginMutation(
      new Request("http://localhost:3000/api/x", { method: "POST" }),
    );
    assert.equal(r.ok, false);
  });

  it("allows matching origin", () => {
    const r = assertSameOriginMutation(
      new Request("http://localhost:3000/api/x", {
        method: "POST",
        headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
      }),
    );
    assert.equal(r.ok, true);
  });
});

describe("MFA role policy", async () => {
  const { roleRequiresMfa, roleSuggestsMfa } = await import("@/lib/auth-mfa");

  it("requires MFA for professional/admin roles", () => {
    assert.equal(roleRequiresMfa("professional"), true);
    assert.equal(roleRequiresMfa("community"), true);
    assert.equal(roleRequiresMfa("internal"), true);
    assert.equal(roleRequiresMfa("family"), false);
    assert.equal(roleSuggestsMfa("family"), true);
  });
});

describe("MFA redirect helper", async () => {
  const { mfaRedirectPath } = await import("@/lib/auth-mfa-redirect");
  it("builds challenge and enroll paths", () => {
    assert.match(mfaRedirectPath("enroll", { next: "/internal/overview" }), /\/security\/mfa\/enroll/);
    assert.match(
      mfaRedirectPath("challenge", { factorId: "fac_1", next: "/" }),
      /factorId=fac_1/,
    );
  });
});

describe("auth messages do not use accountNotFound for soft flows", async () => {
  const { AUTH_MESSAGES } = await import("@/lib/auth-messages");
  it("has generic credential and rate limit copy", () => {
    assert.ok(AUTH_MESSAGES.badCredentials.includes("Incorrect"));
    assert.ok(AUTH_MESSAGES.rateLimited.length > 0);
    assert.ok(AUTH_MESSAGES.compromisedPassword.length > 0);
    assert.match(AUTH_MESSAGES.weakPassword, /12/);
  });
});
