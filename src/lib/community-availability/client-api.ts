"use client";

/**
 * Browser client for the community-availability API. Mirrors
 * community-profile/client-api.ts and staff-team/client-api.ts's
 * call()/csrfHeader() pattern.
 */
import type { AvailabilityUnit } from "@/lib/community-portal";

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

/** null means the call failed (network error, non-2xx) — distinct from a
 * genuine empty list, so a caller refreshing in the background never wipes
 * real data because of a transient failure. */
export async function apiListAvailability(siteId: string): Promise<AvailabilityUnit[] | null> {
  const res = await call<{ availability: AvailabilityUnit[] }>(
    `/api/community/availability?siteId=${encodeURIComponent(siteId)}`,
  );
  return res?.ok ? (res.availability ?? []) : null;
}

export async function apiUpsertAvailability(
  siteId: string,
  unit: AvailabilityUnit,
): Promise<{ ok: boolean; unit?: AvailabilityUnit; error?: string }> {
  const res = await call<{ unit: AvailabilityUnit }>("/api/community/availability", {
    method: "POST",
    body: JSON.stringify({ siteId, unit }),
  });
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, unit: res.unit, error: res.error };
}

export async function apiRemoveAvailability(
  siteId: string,
  unitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await call<Record<string, never>>(
    `/api/community/availability/${encodeURIComponent(unitId)}?siteId=${encodeURIComponent(siteId)}`,
    { method: "DELETE" },
  );
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, error: res.error };
}
