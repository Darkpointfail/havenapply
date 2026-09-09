"use client";

/**
 * Browser client for the community-profile API.
 * Mirrors admissions/client-api.ts's call()/csrfHeader() pattern.
 */
import type { CommunityProfile } from "@/lib/community-portal";

type Envelope<T> = { ok: boolean; error?: string } & Partial<T>;

async function csrfHeader(): Promise<Record<string, string>> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)haven_csrf=([^;]+)/);
    if (match) return { "x-haven-csrf": decodeURIComponent(match[1]) };
    const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    const json = (await res.json()) as { csrfToken?: string };
    return json.csrfToken ? { "x-haven-csrf": json.csrfToken } : {};
  } catch {
    return {};
  }
}

async function call<T>(input: RequestInfo, init?: RequestInit): Promise<Envelope<T> | null> {
  try {
    const method = (init?.method ?? "GET").toUpperCase();
    const extra = method === "GET" ? {} : await csrfHeader();
    const res = await fetch(input, {
      credentials: "same-origin",
      ...init,
      headers: { "Content-Type": "application/json", ...extra, ...(init?.headers ?? {}) },
    });
    const json = (await res.json()) as Envelope<T>;
    if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}` } as Envelope<T>;
    return json;
  } catch {
    return null;
  }
}

/** Public read — no auth required, used by both the staff console and the
 * public listing pages. `siteName` is the registry's name for the site,
 * for callers building a blank profile when none has been saved yet. */
export async function apiGetCommunityProfile(
  siteId: string,
): Promise<{ profile: CommunityProfile | null; siteName: string | null }> {
  const res = await call<{ profile: CommunityProfile | null; siteName: string | null }>(
    `/api/community/profile/${encodeURIComponent(siteId)}`,
  );
  return res?.ok
    ? { profile: res.profile ?? null, siteName: res.siteName ?? null }
    : { profile: null, siteName: null };
}

/** Staff write, scoped to the caller's own site membership. */
export async function apiSaveCommunityProfile(
  siteId: string,
  profile: CommunityProfile,
): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ profile: CommunityProfile }>("/api/community/profile-save", {
    method: "POST",
    body: JSON.stringify({ siteId, profile }),
  });
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, error: res.error };
}
