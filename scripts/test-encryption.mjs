/**
 * Encryption / signed-token self-tests.
 * Run: node scripts/test-encryption.mjs
 */
import { webcrypto } from "node:crypto";

const crypto = webcrypto;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return new Uint8Array(Buffer.from(padded + pad, "base64"));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(secret, message) {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

async function hmacVerify(secret, message, signatureB64Url) {
  const key = await importHmacKey(secret);
  const sig = fromBase64Url(signatureB64Url);
  return crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(message));
}

async function mint(secret, typ, claims, ttlSeconds) {
  const now = Date.now();
  const body = { ...claims, typ, iat: now, exp: now + ttlSeconds * 1000, n: "abc" };
  const payload = toBase64Url(Buffer.from(JSON.stringify(body)));
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

async function verify(secret, token, expectedTyp, previous) {
  const [payload, sig] = token.split(".");
  let ok = await hmacVerify(secret, payload, sig);
  if (!ok && previous) ok = await hmacVerify(previous, payload, sig);
  if (!ok) return { ok: false, error: "bad_signature" };
  const body = JSON.parse(Buffer.from(fromBase64Url(payload)).toString("utf8"));
  if (body.typ !== expectedTyp) return { ok: false, error: "bad_payload" };
  if (Date.now() > body.exp) return { ok: false, error: "expired" };
  return { ok: true, body };
}

function safeDownloadFilename({ documentId, mimeType, originalName }) {
  const id = documentId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "document";
  let ext = "";
  if (mimeType === "application/pdf") ext = "pdf";
  else if (originalName) {
    const m = /\.([a-zA-Z0-9]{1,8})$/.exec(originalName);
    if (m) ext = m[1].toLowerCase();
  }
  return ext ? `haven-${id}.${ext}` : `haven-${id}`;
}

async function pbkdf2Hash(password, saltHex, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const salt = Buffer.from(saltHex, "hex");
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256,
  );
  return Buffer.from(bits).toString("hex");
}

async function aesRoundTrip() {
  const keyRaw = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode("sensitive-document-bytes");
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  assert(new TextDecoder().decode(out) === "sensitive-document-bytes", "AES-GCM roundtrip");
}

async function main() {
  const secret = "test-signing-secret";
  const token = await mint(secret, "doc_download", { docId: "doc_1", elevated: true }, 60);
  const good = await verify(secret, token, "doc_download");
  assert(good.ok, "valid token verifies");

  const bad = await verify("other-secret", token, "doc_download");
  assert(!bad.ok, "wrong secret rejected");

  const rotated = await mint("old-secret", "site_access_v5", { v: 5 }, 60);
  const grace = await verify("new-secret", rotated, "site_access_v5", "old-secret");
  assert(grace.ok, "previous secret accepted during rotation");

  const expired = await mint(secret, "doc_download", { docId: "x" }, -1);
  const exp = await verify(secret, expired, "doc_download");
  assert(!exp.ok && exp.error === "expired", "expired rejected");

  const name = safeDownloadFilename({
    documentId: "abc-123",
    mimeType: "application/pdf",
    originalName: "John_Doe_SSN_card.pdf",
  });
  assert(name === "haven-abc-123.pdf", "download name is opaque");
  assert(!name.toLowerCase().includes("john"), "no PII in filename");

  const hash = await pbkdf2Hash("CorrectHorseBattery", "aabbccddeeff00112233445566778899", 1000);
  assert(hash.length === 64, "pbkdf2 hex length");

  await aesRoundTrip();

  console.log("test-encryption: all passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
