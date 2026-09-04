/**
 * Credential lifecycle: registration, verified sign-in, email verification,
 * password reset. Every path is rate limited and audited.
 *
 * Local backend only. In Supabase mode these operations belong to Supabase
 * Auth and the routes delegate to it.
 */

import type { UserRole } from "@/lib/auth-store";
import {
  checkPasswordPolicy,
  dummyVerify,
  hashPassword,
  newToken,
  verifyPassword,
} from "@/lib/security/password";
import {
  consumeRateLimit,
  createCredential,
  findCredentialByEmail,
  hashLookup,
  hashToken,
  recordAuditEvent,
  revokeAllSessionsForUser,
  updateCredential,
  type CredentialRecord,
} from "@/lib/security/identity-store";

export const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 h
export const RESET_TTL_MS = 1000 * 60 * 30; // 30 min

export const RATE_LIMITS = {
  signIn: { limit: 5, windowMs: 1000 * 60 * 15 },
  signUp: { limit: 5, windowMs: 1000 * 60 * 60 },
  reset: { limit: 5, windowMs: 1000 * 60 * 60 },
  verify: { limit: 10, windowMs: 1000 * 60 * 60 },
  invite: { limit: 20, windowMs: 1000 * 60 * 60 },
  upload: { limit: 60, windowMs: 1000 * 60 * 10 },
} as const;

export type ServiceFailure = { ok: false; status: number; error: string };
export type ServiceResult<T> = { ok: true; data: T } | ServiceFailure;

/** Verification is required for family accounts before a session is issued. */
export function requiresVerifiedEmail(role: UserRole): boolean {
  return role === "family";
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function limit(
  bucket: keyof typeof RATE_LIMITS,
  discriminator: string,
): Promise<ServiceFailure | null> {
  const { limit: max, windowMs } = RATE_LIMITS[bucket];
  const verdict = await consumeRateLimit(`${bucket}:${hashLookup(discriminator)}`, max, windowMs);
  if (verdict.allowed) return null;
  return {
    ok: false,
    status: 429,
    error: `Too many attempts. Try again in ${verdict.retryAfterSeconds} seconds.`,
  };
}

export type RegisterInput = {
  email: unknown;
  password: unknown;
  role: UserRole;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  fingerprint: string;
};

export async function registerAccount(
  input: RegisterInput,
): Promise<ServiceResult<{ userId: string; verificationToken: string | null }>> {
  const throttled = await limit("signUp", input.fingerprint);
  if (throttled) return throttled;

  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, status: 400, error: "Enter a valid email address." };

  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) return { ok: false, status: 400, error: policy.error };

  const passwordHash = await hashPassword(input.password as string);
  const needsVerification = requiresVerifiedEmail(input.role);
  const token = needsVerification ? newToken() : null;

  const created = await createCredential({
    email,
    passwordHash,
    role: input.role,
    firstName: typeof input.firstName === "string" ? input.firstName.trim().slice(0, 100) : "",
    lastName: typeof input.lastName === "string" ? input.lastName.trim().slice(0, 100) : "",
    phone: typeof input.phone === "string" ? input.phone.trim().slice(0, 40) : undefined,
    verificationTokenHash: token ? hashToken(token) : null,
    verificationExpiresAt: token ? new Date(Date.now() + VERIFICATION_TTL_MS).toISOString() : null,
    emailVerifiedAt: needsVerification ? null : new Date().toISOString(),
  });

  if (!created.ok) {
    await recordAuditEvent({
      event: "auth.sign_up",
      outcome: "failure",
      subject: email,
      metadata: { reason: "duplicate" },
    });
    // Same shape as success would be better against enumeration, but the
    // product needs to tell a returning user their account exists.
    return { ok: false, status: 409, error: created.error };
  }

  await recordAuditEvent({
    event: "auth.sign_up",
    outcome: "success",
    subject: email,
    actorId: created.record.userId,
    metadata: { role: input.role, verificationRequired: needsVerification },
  });

  return { ok: true, data: { userId: created.record.userId, verificationToken: token } };
}

export type SignInInput = {
  email: unknown;
  password: unknown;
  expectedRole?: UserRole;
  fingerprint: string;
};

/**
 * Verifies the password server-side. The response never reveals whether the
 * email exists, and both branches perform comparable work.
 */
export async function verifyCredentials(
  input: SignInInput,
): Promise<ServiceResult<CredentialRecord>> {
  const email = normalizeEmail(input.email);
  const throttleKey = email ?? input.fingerprint;

  const throttledByIdentity = await limit("signIn", throttleKey);
  if (throttledByIdentity) return throttledByIdentity;
  const throttledByOrigin = await limit("signIn", input.fingerprint);
  if (throttledByOrigin) return throttledByOrigin;

  const invalid: ServiceFailure = {
    ok: false,
    status: 401,
    error: "Incorrect email or password.",
  };

  if (!email || typeof input.password !== "string") {
    await dummyVerify();
    return invalid;
  }

  const credential = await findCredentialByEmail(email);
  if (!credential) {
    await dummyVerify();
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      metadata: { reason: "unknown_account" },
    });
    return invalid;
  }

  const matches = await verifyPassword(input.password, credential.passwordHash);
  if (!matches) {
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      actorId: credential.userId,
      metadata: { reason: "bad_password" },
    });
    return invalid;
  }

  if (credential.disabledAt) {
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      actorId: credential.userId,
      metadata: { reason: "disabled" },
    });
    return { ok: false, status: 403, error: "This account is disabled." };
  }

  if (input.expectedRole && credential.role !== input.expectedRole) {
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      actorId: credential.userId,
      metadata: { reason: "wrong_portal" },
    });
    return { ok: false, status: 403, error: "This portal is not available for your account." };
  }

  if (requiresVerifiedEmail(credential.role) && !credential.emailVerifiedAt) {
    await recordAuditEvent({
      event: "auth.sign_in",
      outcome: "failure",
      subject: email,
      actorId: credential.userId,
      metadata: { reason: "email_unverified" },
    });
    return { ok: false, status: 403, error: "Confirm your email address before signing in." };
  }

  await recordAuditEvent({
    event: "auth.sign_in",
    outcome: "success",
    subject: email,
    actorId: credential.userId,
  });
  return { ok: true, data: credential };
}

export async function verifyEmailToken(
  token: unknown,
  fingerprint: string,
): Promise<ServiceResult<{ userId: string }>> {
  const throttled = await limit("verify", fingerprint);
  if (throttled) return throttled;

  if (typeof token !== "string" || !token) {
    return { ok: false, status: 400, error: "Invalid confirmation link." };
  }

  const tokenHash = hashToken(token);
  const credentials = await findCredentialByVerificationHash(tokenHash);
  if (!credentials) {
    await recordAuditEvent({
      event: "auth.email_verify",
      outcome: "failure",
      metadata: { reason: "unknown_token" },
    });
    return { ok: false, status: 400, error: "This confirmation link is no longer valid." };
  }

  if (
    !credentials.verificationExpiresAt ||
    Date.parse(credentials.verificationExpiresAt) < Date.now()
  ) {
    await recordAuditEvent({
      event: "auth.email_verify",
      outcome: "failure",
      actorId: credentials.userId,
      metadata: { reason: "expired" },
    });
    return { ok: false, status: 400, error: "This confirmation link has expired." };
  }

  await updateCredential(credentials.userId, {
    emailVerifiedAt: new Date().toISOString(),
    verificationTokenHash: null,
    verificationExpiresAt: null,
  });
  await recordAuditEvent({
    event: "auth.email_verify",
    outcome: "success",
    actorId: credentials.userId,
  });

  return { ok: true, data: { userId: credentials.userId } };
}

async function findCredentialByVerificationHash(hash: string): Promise<CredentialRecord | null> {
  const { listCredentialsForLookup } = await import("@/lib/security/identity-lookup");
  const all = await listCredentialsForLookup();
  return all.find((c) => c.verificationTokenHash === hash) ?? null;
}

async function findCredentialByResetHash(hash: string): Promise<CredentialRecord | null> {
  const { listCredentialsForLookup } = await import("@/lib/security/identity-lookup");
  const all = await listCredentialsForLookup();
  return all.find((c) => c.resetTokenHash === hash) ?? null;
}

/** Always reports success: the response must not disclose account existence. */
export async function requestPasswordReset(
  email: unknown,
  fingerprint: string,
): Promise<ServiceResult<{ token: string | null }>> {
  const throttled = await limit("reset", fingerprint);
  if (throttled) return throttled;

  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: true, data: { token: null } };

  const credential = await findCredentialByEmail(normalized);
  if (!credential) {
    await recordAuditEvent({
      event: "auth.reset_request",
      outcome: "failure",
      subject: normalized,
      metadata: { reason: "unknown_account" },
    });
    return { ok: true, data: { token: null } };
  }

  const token = newToken();
  await updateCredential(credential.userId, {
    resetTokenHash: hashToken(token),
    resetExpiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    resetUsedAt: null,
  });
  await recordAuditEvent({
    event: "auth.reset_request",
    outcome: "success",
    subject: normalized,
    actorId: credential.userId,
  });

  return { ok: true, data: { token } };
}

/** Single use and time limited; consuming it revokes every existing session. */
export async function completePasswordReset(input: {
  token: unknown;
  password: unknown;
  fingerprint: string;
}): Promise<ServiceResult<{ userId: string }>> {
  const throttled = await limit("reset", input.fingerprint);
  if (throttled) return throttled;

  if (typeof input.token !== "string" || !input.token) {
    return { ok: false, status: 400, error: "Invalid reset link." };
  }
  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) return { ok: false, status: 400, error: policy.error };

  const credential = await findCredentialByResetHash(hashToken(input.token));
  if (!credential || !credential.resetExpiresAt) {
    await recordAuditEvent({
      event: "auth.reset_complete",
      outcome: "failure",
      metadata: { reason: "unknown_token" },
    });
    return { ok: false, status: 400, error: "This reset link is no longer valid." };
  }
  if (credential.resetUsedAt) {
    await recordAuditEvent({
      event: "auth.reset_complete",
      outcome: "failure",
      actorId: credential.userId,
      metadata: { reason: "already_used" },
    });
    return { ok: false, status: 400, error: "This reset link has already been used." };
  }
  if (Date.parse(credential.resetExpiresAt) < Date.now()) {
    await recordAuditEvent({
      event: "auth.reset_complete",
      outcome: "failure",
      actorId: credential.userId,
      metadata: { reason: "expired" },
    });
    return { ok: false, status: 400, error: "This reset link has expired." };
  }

  const passwordHash = await hashPassword(input.password as string);
  await updateCredential(credential.userId, {
    passwordHash,
    resetTokenHash: null,
    resetExpiresAt: null,
    resetUsedAt: new Date().toISOString(),
  });
  const revoked = await revokeAllSessionsForUser(credential.userId);

  await recordAuditEvent({
    event: "auth.reset_complete",
    outcome: "success",
    actorId: credential.userId,
    metadata: { sessionsRevoked: revoked },
  });

  return { ok: true, data: { userId: credential.userId } };
}

export async function enforceRateLimit(
  bucket: keyof typeof RATE_LIMITS,
  discriminator: string,
): Promise<ServiceFailure | null> {
  return limit(bucket, discriminator);
}
