/**
 * Client-side AES-GCM envelope for IndexedDB document blobs (demo / local backend).
 * Uses Web Crypto AES-GCM + random DEK — no homemade ciphers.
 *
 * Production PHI must live in private Supabase Storage (platform encryption at rest)
 * accessed only via short-lived signed URLs. This module is an extra local safeguard.
 */

const MASTER_KEY_STORAGE = "haven-doc-kek-v1";
const WRAP_PREFIX = "haven-aesgcm-v1:";

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  if (typeof localStorage === "undefined" || typeof crypto === "undefined") {
    throw new Error("Web Crypto / localStorage unavailable");
  }
  let rawB64 = localStorage.getItem(MASTER_KEY_STORAGE);
  if (!rawB64) {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    rawB64 = toB64(raw);
    localStorage.setItem(MASTER_KEY_STORAGE, rawB64);
  }
  const raw = fromB64(rawB64);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a Blob → opaque Blob (binary envelope).
 * Format: UTF-8 magic + base64(iv).base64(ciphertext) as text blob for simplicity,
 * or raw binary. We use a binary envelope: magic(16) | iv(12) | ciphertext.
 */
export async function encryptDocBlob(plaintext: Blob): Promise<Blob> {
  const key = await getOrCreateMasterKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const plainBuf = await plaintext.arrayBuffer();
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBuf);
  const magic = new TextEncoder().encode(WRAP_PREFIX);
  const out = new Uint8Array(magic.length + iv.length + cipherBuf.byteLength);
  out.set(magic, 0);
  out.set(iv, magic.length);
  out.set(new Uint8Array(cipherBuf), magic.length + iv.length);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptDocBlob(stored: Blob): Promise<Blob> {
  const buf = new Uint8Array(await stored.arrayBuffer());
  const magic = new TextEncoder().encode(WRAP_PREFIX);
  const looksEncrypted =
    buf.length > magic.length + 12 + 16 &&
    magic.every((b, i) => buf[i] === b);

  // Backward compatible: unencrypted legacy blobs pass through.
  if (!looksEncrypted) {
    return stored;
  }

  const key = await getOrCreateMasterKey();
  const iv = buf.slice(magic.length, magic.length + 12);
  const ciphertext = buf.slice(magic.length + 12);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext.buffer as ArrayBuffer,
  );
  return new Blob([plain]);
}

/** Rotate local KEK (re-encrypt must be done by caller for existing blobs). */
export function clearLocalDocMasterKey() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(MASTER_KEY_STORAGE);
  }
}
