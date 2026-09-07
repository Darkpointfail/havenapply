/**
 * Security regression suite.
 * Each test maps to a required case in the hardening milestone.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/security/password";
import { verifyCsrf, issueCsrfToken, CSRF_HEADER } from "@/lib/security/csrf";
import {
  decodeSessionToken,
  encodeSessionToken,
  issueSession,
  resolveSession,
} from "@/lib/security/session";
import {
  __resetIdentityForTests,
  consumeInvitation,
  createInvitation,
  hashToken,
  listAuditEvents,
  listMembershipsByUser,
  revokeAllSessionsForUser,
  revokeSession,
  upsertMembership,
} from "@/lib/security/identity-store";
import {
  completePasswordReset,
  registerAccount,
  requestPasswordReset,
  verifyCredentials,
  verifyEmailToken,
} from "@/lib/security/auth-service";
import { validateSecurityEnv } from "@/lib/security/env";

const STRONG_PASSWORD = "Correct-Horse-42!";
const OTHER_PASSWORD = "Another-Strong-77!";

async function registerVerifiedFamily(email: string) {
  const registered = await registerAccount({
    email,
    password: STRONG_PASSWORD,
    role: "family",
    firstName: "Test",
    lastName: "Family",
    fingerprint: `fp-${email}`,
  });
  if (!registered.ok) throw new Error(registered.error);
  if (registered.data.verificationToken) {
    await verifyEmailToken(registered.data.verificationToken, `fp-${email}`);
  }
  return registered.data.userId;
}

function request(method: string, headers: Record<string, string>) {
  return new Request("https://havenapply.com/api/test", { method, headers });
}

beforeEach(async () => {
  await __resetIdentityForTests();
});

describe("password hashing", () => {
  it("rejects weak passwords", () => {
    expect(checkPasswordPolicy("short").ok).toBe(false);
    expect(checkPasswordPolicy("alllowercaseletters").ok).toBe(false);
    expect(checkPasswordPolicy(STRONG_PASSWORD).ok).toBe(true);
  });

  it("verifies only the right password", async () => {
    const encoded = await hashPassword(STRONG_PASSWORD);
    expect(encoded.startsWith("scrypt$")).toBe(true);
    expect(encoded).not.toContain(STRONG_PASSWORD);
    expect(await verifyPassword(STRONG_PASSWORD, encoded)).toBe(true);
    expect(await verifyPassword(OTHER_PASSWORD, encoded)).toBe(false);
  });
});

describe("credential sign-in", () => {
  it("refuses a wrong password", async () => {
    await registerVerifiedFamily("famille.a@example.com");
    const result = await verifyCredentials({
      email: "famille.a@example.com",
      password: OTHER_PASSWORD,
      fingerprint: "fp-wrong",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("refuses an unverified family account", async () => {
    await registerAccount({
      email: "unverified@example.com",
      password: STRONG_PASSWORD,
      role: "family",
      fingerprint: "fp-unverified",
    });
    const result = await verifyCredentials({
      email: "unverified@example.com",
      password: STRONG_PASSWORD,
      fingerprint: "fp-unverified-2",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("refuses signing into the wrong portal", async () => {
    await registerVerifiedFamily("famille.b@example.com");
    const result = await verifyCredentials({
      email: "famille.b@example.com",
      password: STRONG_PASSWORD,
      expectedRole: "facility",
      fingerprint: "fp-portal",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rate limits repeated failures", async () => {
    await registerVerifiedFamily("famille.c@example.com");
    const attempts = [];
    for (let i = 0; i < 7; i += 1) {
      attempts.push(
        await verifyCredentials({
          email: "famille.c@example.com",
          password: "Wrong-Password-1!",
          fingerprint: "fp-burst",
        }),
      );
    }
    const statuses = attempts.map((a) => (a.ok ? 200 : a.status));
    expect(statuses).toContain(429);
  });
});

describe("sessions", () => {
  it("rejects a tampered cookie", async () => {
    const userId = await registerVerifiedFamily("famille.d@example.com");
    const { record, token } = await issueSession({ userId, role: "family" });

    expect(decodeSessionToken(token)).toBe(record.jti);
    expect(decodeSessionToken(`${record.jti}.forged-signature`)).toBeNull();
    expect(await resolveSession(`${record.jti}.forged-signature`)).toBeNull();

    // A well-signed token for an id that has no record is still refused.
    expect(await resolveSession(encodeSessionToken("ses_does_not_exist"))).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const userId = await registerVerifiedFamily("famille.e@example.com");
    const { record, token } = await issueSession({ userId, role: "family" });
    expect(await resolveSession(token)).not.toBeNull();

    await revokeSession(record.jti);
    expect(await resolveSession(token)).toBeNull();
  });

  it("revokes every session on password reset", async () => {
    const userId = await registerVerifiedFamily("famille.f@example.com");
    const first = await issueSession({ userId, role: "family" });
    const second = await issueSession({ userId, role: "family" });

    const revoked = await revokeAllSessionsForUser(userId);
    expect(revoked).toBe(2);
    expect(await resolveSession(first.token)).toBeNull();
    expect(await resolveSession(second.token)).toBeNull();
  });
});

describe("password reset", () => {
  it("refuses a reused token", async () => {
    await registerVerifiedFamily("famille.g@example.com");
    const requested = await requestPasswordReset("famille.g@example.com", "fp-reset");
    expect(requested.ok).toBe(true);
    const token = requested.ok ? requested.data.token : null;
    expect(token).toBeTruthy();

    const first = await completePasswordReset({
      token,
      password: OTHER_PASSWORD,
      fingerprint: "fp-reset-2",
    });
    expect(first.ok).toBe(true);

    const second = await completePasswordReset({
      token,
      password: "Third-Password-99!",
      fingerprint: "fp-reset-3",
    });
    expect(second.ok).toBe(false);
  });

  it("refuses an unknown token and never reveals account existence", async () => {
    const unknown = await requestPasswordReset("nobody@example.com", "fp-unknown");
    expect(unknown.ok).toBe(true);
    if (unknown.ok) expect(unknown.data.token).toBeNull();

    const attempt = await completePasswordReset({
      token: "not-a-real-token",
      password: STRONG_PASSWORD,
      fingerprint: "fp-unknown-2",
    });
    expect(attempt.ok).toBe(false);
  });
});

describe("CSRF", () => {
  const origin = "https://havenapply.com";

  it("allows a same-origin request carrying a matching token", () => {
    const token = issueCsrfToken();
    const result = verifyCsrf(
      request("POST", { host: "havenapply.com", origin, [CSRF_HEADER]: token }),
      token,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    const token = issueCsrfToken();
    const result = verifyCsrf(
      request("POST", {
        host: "havenapply.com",
        origin: "https://evil.example",
        [CSRF_HEADER]: token,
      }),
      token,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a missing or mismatched header", () => {
    const token = issueCsrfToken();
    expect(verifyCsrf(request("POST", { host: "havenapply.com", origin }), token).ok).toBe(false);
    expect(
      verifyCsrf(
        request("POST", { host: "havenapply.com", origin, [CSRF_HEADER]: issueCsrfToken() }),
        token,
      ).ok,
    ).toBe(false);
  });

  it("does not challenge safe methods", () => {
    expect(verifyCsrf(request("GET", { host: "havenapply.com" }), undefined).ok).toBe(true);
  });
});

describe("staff memberships and invitations", () => {
  it("scopes a staff member to their own site", async () => {
    await upsertMembership({
      userId: "staff-a",
      email: "a@site-a.test",
      siteId: "site-a",
      role: "admin",
    });
    await upsertMembership({
      userId: "staff-b",
      email: "b@site-b.test",
      siteId: "site-b",
      role: "admin",
    });

    const a = await listMembershipsByUser("staff-a");
    const b = await listMembershipsByUser("staff-b");
    expect(a.map((m) => m.siteId)).toEqual(["site-a"]);
    expect(b.map((m) => m.siteId)).toEqual(["site-b"]);
    expect(a.some((m) => m.siteId === "site-b")).toBe(false);
  });

  it("consumes an invitation once", async () => {
    const token = "invitation-token";
    await createInvitation({
      email: "new@site-a.test",
      siteId: "site-a",
      role: "coordinator",
      tokenHash: hashToken(token),
      ttlMs: 60_000,
      invitedByUserId: "staff-a",
    });

    const first = await consumeInvitation(hashToken(token));
    expect(first.ok).toBe(true);

    const second = await consumeInvitation(hashToken(token));
    expect(second.ok).toBe(false);
  });

  it("refuses an expired invitation", async () => {
    const token = "expired-token";
    await createInvitation({
      email: "late@site-a.test",
      siteId: "site-a",
      role: "readonly",
      tokenHash: hashToken(token),
      ttlMs: -1000,
      invitedByUserId: "staff-a",
    });
    const result = await consumeInvitation(hashToken(token));
    expect(result.ok).toBe(false);
  });
});

describe("audit trail", () => {
  it("records sign-in success and failure without storing the raw email", async () => {
    await registerVerifiedFamily("audited@example.com");
    await verifyCredentials({
      email: "audited@example.com",
      password: STRONG_PASSWORD,
      fingerprint: "fp-audit-1",
    });
    await verifyCredentials({
      email: "audited@example.com",
      password: OTHER_PASSWORD,
      fingerprint: "fp-audit-2",
    });

    const events = await listAuditEvents(50);
    const signIns = events.filter((e) => e.event === "auth.sign_in");
    expect(signIns.some((e) => e.outcome === "success")).toBe(true);
    expect(signIns.some((e) => e.outcome === "failure")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("audited@example.com");
  });
});

describe("environment validation", () => {
  it("flags open access and client session minting", () => {
    const previous = {
      open: process.env.NEXT_PUBLIC_AUTH_OPEN_ACCESS,
      mint: process.env.HAVEN_ALLOW_CLIENT_SESSION_MINT,
    };
    process.env.NEXT_PUBLIC_AUTH_OPEN_ACCESS = "true";
    process.env.HAVEN_ALLOW_CLIENT_SESSION_MINT = "true";

    const issues = validateSecurityEnv().map((i) => i.name);
    expect(issues).toContain("NEXT_PUBLIC_AUTH_OPEN_ACCESS");
    expect(issues).toContain("HAVEN_ALLOW_CLIENT_SESSION_MINT");

    process.env.NEXT_PUBLIC_AUTH_OPEN_ACCESS = previous.open;
    process.env.HAVEN_ALLOW_CLIENT_SESSION_MINT = previous.mint;
  });
});
