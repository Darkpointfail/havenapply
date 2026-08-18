import { AUTH_MESSAGES } from "@/lib/auth-messages";
import {
  createSalt,
  createToken,
  hashPassword,
  isValidPassword,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth-crypto";

export type UserRole =
  | "family"
  | "professional"
  | "facility"
  | "community"
  | "internal";

/** Roles selectable during account creation. */
export type SignupRole = "family" | "professional" | "facility";

export type CommunityStatus = "pending" | "verified" | "rejected";

export function parseUserRole(value: unknown): UserRole | null {
  if (value === "residence") return "community";
  if (
    value === "family" ||
    value === "professional" ||
    value === "facility" ||
    value === "community" ||
    value === "internal"
  ) {
    return value;
  }
  return null;
}

export function isFacilityRole(role: UserRole) {
  return role === "facility" || role === "community";
}

/** Human-readable label stored in Auth user_metadata for the Supabase dashboard. */
export function accountTypeLabel(role: UserRole | SignupRole): string {
  if (role === "family") return "Family";
  if (role === "professional") return "Care Professional";
  if (role === "facility" || role === "community") return "Care Community";
  if (role === "internal") return "Internal";
  return "Other";
}

export type AccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailConfirmed: boolean;
  confirmToken: string | null;
  confirmExpiresAt: number | null;
  resetToken: string | null;
  resetExpiresAt: number | null;
  organization?: string;
  jobTitle?: string;
  phone?: string;
  communityStatus?: CommunityStatus;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  organization?: string;
  jobTitle?: string;
  emailConfirmed: boolean;
  communityStatus?: CommunityStatus;
  onboardingCompleted: boolean;
};

export type AuthOk<T = void> = { ok: true; data: T };
export type AuthFail = { ok: false; error: string };
export type AuthResult<T = void> = AuthOk<T> | AuthFail;

const ACCOUNTS_KEY = "haven-accounts-v1";
const SESSION_KEY = "haven-auth";
const CONFIRM_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const RESET_TTL_MS = 1000 * 60 * 30; // 30 minutes (OWASP: short-lived reset tokens)

function uid() {
  return `acc_${createToken().slice(0, 16)}`;
}

function displayName(a: Pick<AccountRecord, "firstName" | "lastName">) {
  return `${a.firstName} ${a.lastName}`.trim() || "Haven user";
}

export function toSessionUser(a: AccountRecord): SessionUser {
  return {
    id: a.id,
    email: a.email,
    firstName: a.firstName,
    lastName: a.lastName,
    name: displayName(a),
    role: a.role,
    organization: a.organization,
    jobTitle: a.jobTitle,
    emailConfirmed: a.emailConfirmed,
    communityStatus: a.communityStatus,
    onboardingCompleted: a.onboardingCompleted,
  };
}

function readAccounts(): AccountRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccountRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: AccountRecord[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const role = parseUserRole(parsed.role);
    if (!parsed.id || !parsed.email || !role) return null;
    return {
      id: String(parsed.id),
      email: String(parsed.email),
      firstName: String(parsed.firstName || ""),
      lastName: String(parsed.lastName || ""),
      name: String(parsed.name || `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim()),
      role,
      organization: parsed.organization ? String(parsed.organization) : undefined,
      jobTitle: parsed.jobTitle ? String(parsed.jobTitle) : undefined,
      emailConfirmed: Boolean(parsed.emailConfirmed),
      communityStatus: parsed.communityStatus as SessionUser["communityStatus"],
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
    };
  } catch {
    return null;
  }
}

export function writeSession(user: SessionUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

function findByEmail(email: string) {
  const normalized = normalizeEmail(email);
  return readAccounts().find((a) => a.email === normalized) ?? null;
}

function findByConfirmToken(token: string) {
  return readAccounts().find((a) => a.confirmToken === token) ?? null;
}

function findByResetToken(token: string) {
  return readAccounts().find((a) => a.resetToken === token) ?? null;
}

function saveAccount(updated: AccountRecord) {
  const all = readAccounts();
  const idx = all.findIndex((a) => a.id === updated.id);
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  writeAccounts(all);
  return updated;
}

async function makeAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organization?: string;
  jobTitle?: string;
  phone?: string;
  emailConfirmed?: boolean;
  communityStatus?: CommunityStatus;
  onboardingCompleted?: boolean;
}): Promise<AccountRecord> {
  const salt = createSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const confirmToken = input.emailConfirmed ? null : createToken();
  return {
    id: uid(),
    email: normalizeEmail(input.email),
    passwordHash,
    salt,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role,
    emailConfirmed: Boolean(input.emailConfirmed),
    confirmToken,
    confirmExpiresAt: confirmToken ? Date.now() + CONFIRM_TTL_MS : null,
    resetToken: null,
    resetExpiresAt: null,
    organization: input.organization?.trim(),
    jobTitle: input.jobTitle?.trim(),
    phone: input.phone?.trim(),
    communityStatus: input.communityStatus,
    onboardingCompleted: Boolean(input.onboardingCompleted),
    createdAt: new Date().toISOString(),
  };
}

/** No seeded demo accounts, start empty for a clean product experience. */
export async function ensureSeedAccounts() {
  // intentionally empty
}

export type SignUpFamilyInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

export type SignUpCommunityInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organization: string;
  jobTitle: string;
  phone?: string;
  acceptedTerms: boolean;
};

export type SignUpWithRoleInput = {
  role: SignupRole;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  organization?: string;
  jobTitle?: string;
  phone?: string;
};

export async function signUpFamilyAccount(
  input: SignUpFamilyInput,
): Promise<AuthResult<SessionUser>> {
  if (!input.acceptedTerms) return { ok: false, error: AUTH_MESSAGES.acceptTerms };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  if (!isValidPassword(input.password)) return { ok: false, error: AUTH_MESSAGES.weakPassword };
  if (findByEmail(input.email)) return { ok: false, error: AUTH_MESSAGES.emailTaken };

  const account = await makeAccount({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    role: "family",
    emailConfirmed: true,
    onboardingCompleted: false,
  });
  // Ready to use immediately (no email gate in this simplified flow)
  account.confirmToken = null;
  account.confirmExpiresAt = null;
  saveAccount(account);
  const session = toSessionUser(account);
  writeSession(session);
  return { ok: true, data: session };
}

export async function signUpCommunityAccount(
  input: SignUpCommunityInput,
): Promise<AuthResult<SessionUser>> {
  return signUpWithRoleAccount({
    role: "facility",
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    organization: input.organization,
    jobTitle: input.jobTitle,
    phone: input.phone,
    acceptedTerms: input.acceptedTerms,
  });
}

export async function signUpWithRoleAccount(
  input: SignUpWithRoleInput,
): Promise<AuthResult<SessionUser>> {
  if (!input.acceptedTerms) return { ok: false, error: AUTH_MESSAGES.acceptTerms };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  const needsOrg = input.role === "professional" || input.role === "facility";
  if (needsOrg && (!input.organization?.trim() || !input.jobTitle?.trim())) {
    return { ok: false, error: AUTH_MESSAGES.required };
  }
  if (!isValidPassword(input.password)) return { ok: false, error: AUTH_MESSAGES.weakPassword };
  if (findByEmail(input.email)) return { ok: false, error: AUTH_MESSAGES.emailTaken };

  const account = await makeAccount({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    organization: input.organization,
    jobTitle: input.jobTitle,
    phone: input.phone,
    emailConfirmed: true,
    communityStatus: input.role === "facility" ? "verified" : undefined,
    onboardingCompleted: input.role !== "family",
  });
  account.confirmToken = null;
  account.confirmExpiresAt = null;
  saveAccount(account);
  const session = toSessionUser(account);
  writeSession(session);
  return { ok: true, data: session };
}

export async function signInAccount(input: {
  email: string;
  password: string;
  expectedRole?: UserRole;
}): Promise<AuthResult<SessionUser>> {
  const account = findByEmail(input.email);
  if (!account) return { ok: false, error: AUTH_MESSAGES.badCredentials };

  const valid = await verifyPassword(input.password, account.salt, account.passwordHash);
  if (!valid) return { ok: false, error: AUTH_MESSAGES.badCredentials };

  if (!account.emailConfirmed) {
    return { ok: false, error: AUTH_MESSAGES.confirmBeforeSignIn };
  }

  if (input.expectedRole && account.role !== input.expectedRole) {
    const facilityAlias =
      (input.expectedRole === "facility" && account.role === "community") ||
      (input.expectedRole === "community" && account.role === "facility");
    if (!facilityAlias) return { ok: false, error: AUTH_MESSAGES.accessDenied };
  }

  const session = toSessionUser(account);
  writeSession(session);
  return { ok: true, data: session };
}

export function signOutAccount() {
  writeSession(null);
}

export function confirmEmailToken(token: string): AuthResult<SessionUser> {
  if (!token) return { ok: false, error: AUTH_MESSAGES.confirmInvalid };
  const account = findByConfirmToken(token);
  if (!account) {
    // Idempotent: already confirmed accounts won't still hold the token.
    return { ok: false, error: AUTH_MESSAGES.confirmInvalid };
  }
  if (account.confirmExpiresAt && Date.now() > account.confirmExpiresAt) {
    return { ok: false, error: AUTH_MESSAGES.confirmExpired };
  }

  const updated = saveAccount({
    ...account,
    emailConfirmed: true,
    confirmToken: null,
    confirmExpiresAt: null,
  });
  return { ok: true, data: toSessionUser(updated) };
}

export function resendConfirmation(email: string): AuthResult<{ email: string; confirmToken: string }> {
  const account = findByEmail(email);
  // Soft success — never reveal whether the account exists.
  if (!account) {
    return { ok: true, data: { email: normalizeEmail(email), confirmToken: "" } };
  }
  if (account.emailConfirmed) {
    return { ok: true, data: { email: account.email, confirmToken: "" } };
  }

  const confirmToken = createToken();
  saveAccount({
    ...account,
    confirmToken,
    confirmExpiresAt: Date.now() + CONFIRM_TTL_MS,
  });
  return { ok: true, data: { email: account.email, confirmToken } };
}

export function requestPasswordReset(
  email: string,
): AuthResult<{ email: string; resetToken: string | null; sent: boolean }> {
  const account = findByEmail(email);
  // Always succeed from user POV when email format ok, but return token only if found (demo inbox).
  if (!account) {
    return { ok: true, data: { email: normalizeEmail(email), resetToken: null, sent: true } };
  }

  const resetToken = createToken();
  saveAccount({
    ...account,
    resetToken,
    resetExpiresAt: Date.now() + RESET_TTL_MS,
  });
  return { ok: true, data: { email: account.email, resetToken, sent: true } };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<AuthResult> {
  if (!isValidPassword(input.password)) return { ok: false, error: AUTH_MESSAGES.weakPassword };
  const account = findByResetToken(input.token);
  if (!account) return { ok: false, error: AUTH_MESSAGES.resetInvalid };
  if (!account.resetExpiresAt || Date.now() > account.resetExpiresAt) {
    return { ok: false, error: AUTH_MESSAGES.resetExpired };
  }

  const salt = createSalt();
  const passwordHash = await hashPassword(input.password, salt);
  saveAccount({
    ...account,
    salt,
    passwordHash,
    resetToken: null,
    resetExpiresAt: null,
  });
  // Password change invalidates the current session, caller should re-sign-in
  writeSession(null);
  return { ok: true, data: undefined };
}

export async function changeAccountPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  if (!isValidPassword(newPassword)) return { ok: false, error: AUTH_MESSAGES.weakPassword };
  const account = findByEmail(email);
  if (!account) return { ok: false, error: AUTH_MESSAGES.badCredentials };
  const valid = await verifyPassword(currentPassword, account.salt, account.passwordHash);
  if (!valid) return { ok: false, error: AUTH_MESSAGES.badCredentials };

  const salt = createSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  saveAccount({
    ...account,
    salt,
    passwordHash,
    resetToken: null,
    resetExpiresAt: null,
  });
  // Revoke local session after password change.
  writeSession(null);
  return { ok: true, data: undefined };
}

/** Marks a deletion request on the account (demo, does not wipe immediately). */
export function requestAccountDeletion(email: string): AuthResult {
  const account = findByEmail(email);
  if (!account) return { ok: false, error: AUTH_MESSAGES.badCredentials };
  try {
    const key = `haven-deletion-request-${normalizeEmail(email)}`;
    localStorage.setItem(
      key,
      JSON.stringify({ requestedAt: new Date().toISOString(), email: account.email }),
    );
  } catch {
    /* ignore */
  }
  return { ok: true, data: undefined };
}

export function markOnboardingComplete(userId: string): SessionUser | null {
  const all = readAccounts();
  const account = all.find((a) => a.id === userId);
  if (!account) return null;
  const updated = saveAccount({ ...account, onboardingCompleted: true });
  const session = toSessionUser(updated);
  writeSession(session);
  return session;
}

export function refreshSessionFromStore(userId: string): SessionUser | null {
  const account = readAccounts().find((a) => a.id === userId);
  if (!account) return null;
  const session = toSessionUser(account);
  writeSession(session);
  return session;
}

/** Peek confirm/reset tokens for demo inbox UI only. */
export function getDemoMailbox(email: string) {
  const account = findByEmail(email);
  if (!account) return null;
  return {
    email: account.email,
    confirmToken: account.confirmToken,
    resetToken: account.resetToken,
    emailConfirmed: account.emailConfirmed,
  };
}

export function homeForUser(user: SessionUser) {
  if (user.role === "internal") return "/internal/overview";
  if (isFacilityRole(user.role)) {
    return user.communityStatus === "verified" ? "/community/dashboard" : "/community/pending";
  }
  if (user.role === "professional") return "/professional/dashboard";
  return user.onboardingCompleted ? "/family/dashboard" : "/start";
}

export function homeForRole(role: UserRole) {
  if (isFacilityRole(role)) return "/community/dashboard";
  if (role === "internal") return "/internal/overview";
  if (role === "professional") return "/professional/dashboard";
  return "/family/dashboard";
}
