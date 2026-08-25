/**
 * Standard HMAC-SHA256 helpers (Web Crypto). Not application-specific crypto design.
 */

const textEncoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function hmacVerify(
  secret: string,
  message: string,
  signatureB64Url: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const sig = fromBase64Url(signatureB64Url);
  return crypto.subtle.verify("HMAC", key, sig.buffer as ArrayBuffer, textEncoder.encode(message));
}

export function encodePayload(obj: unknown): string {
  return toBase64Url(textEncoder.encode(JSON.stringify(obj)));
}

export function decodePayload<T>(encoded: string): T | null {
  try {
    const bytes = fromBase64Url(encoded);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export { toBase64Url, fromBase64Url };
