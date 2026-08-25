/**
 * Opaque localStorage key material — never embed raw email / name in key names.
 */

const CACHE_PREFIX = "haven-sk:";

function cacheGet(normalized: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(CACHE_PREFIX + normalized);
  } catch {
    return null;
  }
}

function cacheSet(normalized: string, suffix: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_PREFIX + normalized, suffix);
  } catch {
    /* ignore quota */
  }
}

export async function opaqueStorageSuffix(identifier: string): Promise<string> {
  const normalized = identifier.trim().toLowerCase();
  const cached = cacheGet(normalized);
  if (cached) return cached;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`haven-storage-v1:${normalized}`),
  );
  const suffix = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  cacheSet(normalized, suffix);
  return suffix;
}

/** Prefers opaque v5 key; returns legacy v4 key for migration reads when cache cold. */
export function familyDataKeyCandidates(email: string): { primary: string; legacy: string } {
  const normalized = email.trim().toLowerCase();
  const cached = cacheGet(normalized);
  return {
    primary: cached ? `haven-family-v5-${cached}` : `haven-family-v5-pending`,
    legacy: `haven-family-v4-${normalized}`,
  };
}

export async function familyDataStorageKey(email: string): Promise<string> {
  const suffix = await opaqueStorageSuffix(email);
  return `haven-family-v5-${suffix}`;
}
