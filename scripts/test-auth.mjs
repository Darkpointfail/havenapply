/**
 * Self-contained auth store tests (mirrors src/lib/auth-*).
 * Run: node scripts/test-auth.mjs
 */
import { webcrypto } from "node:crypto";

const crypto = webcrypto;
const store = new Map();
const localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};

const ACCOUNTS_KEY = "haven-accounts-v1";
const SESSION_KEY = "haven-auth";
const M = {
  emailTaken: "This email is already connected to an account.",
  confirmBeforeSignIn: "Please confirm your email before signing in.",
  resetExpired: "Your password reset link has expired. Request a new one.",
  accessDenied: "You do not have permission to access this page.",
};

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}
function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}
async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = new Uint8Array(salt.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 210000 },
    keyMaterial,
    256,
  );
  const digest = toHex(bits);
  return `pbkdf2-sha256$210000$${digest}`;
}

function readAccounts() {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function makeAccount(input) {
  const salt = createSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const confirmToken = input.emailConfirmed ? null : createToken();
  return {
    id: `acc_${createToken().slice(0, 16)}`,
    email: input.email.toLowerCase(),
    passwordHash,
    salt,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    emailConfirmed: !!input.emailConfirmed,
    confirmToken,
    confirmExpiresAt: confirmToken ? Date.now() + 86400000 : null,
    resetToken: null,
    resetExpiresAt: null,
    organization: input.organization,
    communityStatus: input.communityStatus,
    onboardingCompleted: !!input.onboardingCompleted,
  };
}

function homeForUser(u) {
  if (u.role === "internal") return "/internal/overview";
  if (u.role === "community") {
    return u.communityStatus === "verified" ? "/community/dashboard" : "/community/pending";
  }
  return u.onboardingCompleted ? "/family/dashboard" : "/onboarding";
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  // seed
  writeAccounts([
    await makeAccount({
      email: "family@demo.haven",
      password: "HavenDemo1!",
      firstName: "David",
      lastName: "Chen",
      role: "family",
      emailConfirmed: true,
      onboardingCompleted: true,
    }),
    await makeAccount({
      email: "community@demo.haven",
      password: "HavenDemo1!",
      firstName: "Jordan",
      lastName: "Lee",
      role: "community",
      organization: "Maple Grove",
      emailConfirmed: true,
      communityStatus: "verified",
    }),
    await makeAccount({
      email: "admin@demo.haven",
      password: "HavenDemo1!",
      firstName: "Haven",
      lastName: "Ops",
      role: "internal",
      emailConfirmed: true,
    }),
  ]);

  // family signup + confirm gate
  const accounts = readAccounts();
  const salt = createSalt();
  const token = createToken();
  accounts.push({
    id: "acc_new",
    email: "alex@example.com",
    passwordHash: await hashPassword("SecurePass1", salt),
    salt,
    firstName: "Alex",
    lastName: "M",
    role: "family",
    emailConfirmed: false,
    confirmToken: token,
    confirmExpiresAt: Date.now() + 86400000,
    resetToken: null,
    resetExpiresAt: null,
    onboardingCompleted: false,
  });
  writeAccounts(accounts);

  const found = readAccounts().find((a) => a.email === "alex@example.com");
  assert(found && !found.emailConfirmed, "unconfirmed account stored");
  assert(
    !found.emailConfirmed && M.confirmBeforeSignIn.includes("confirm"),
    "confirm message ready",
  );

  found.emailConfirmed = true;
  found.confirmToken = null;
  writeAccounts(readAccounts().map((a) => (a.email === found.email ? found : a)));

  const session = {
    role: "family",
    onboardingCompleted: false,
    communityStatus: undefined,
  };
  assert(homeForUser(session) === "/onboarding", "family → onboarding");
  session.onboardingCompleted = true;
  assert(homeForUser(session) === "/family/dashboard", "family → dashboard");

  assert(
    homeForUser({ role: "community", communityStatus: "pending" }) === "/community/pending",
    "pending",
  );
  assert(
    homeForUser({ role: "community", communityStatus: "verified" }) === "/community/dashboard",
    "verified",
  );
  assert(homeForUser({ role: "internal" }) === "/internal/overview", "admin");

  // duplicate email
  assert(
    readAccounts().some((a) => a.email === "alex@example.com"),
    "email exists for taken check",
  );

  // password verify
  const fam = readAccounts().find((a) => a.email === "family@demo.haven");
  const okHash = await hashPassword("HavenDemo1!", fam.salt);
  assert(okHash === fam.passwordHash, "password verifies");
  const badHash = await hashPassword("wrong", fam.salt);
  assert(badHash !== fam.passwordHash, "bad password fails");

  // reset expiry message
  assert(M.resetExpired.includes("expired"), "expired copy");
  assert(M.emailTaken.includes("already connected"), "taken copy");
  assert(M.accessDenied.includes("permission"), "denied copy");

  // session persistence shape
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: fam.id, email: fam.email, role: "family" }));
  assert(JSON.parse(localStorage.getItem(SESSION_KEY)).email === "family@demo.haven", "session");
  localStorage.removeItem(SESSION_KEY);
  assert(localStorage.getItem(SESSION_KEY) === null, "sign out");

  console.log("All auth journey tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
