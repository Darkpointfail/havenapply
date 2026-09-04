"use client";

/**
 * Browser client for the admissions API.
 * Data wiring only: no component, class or markup depends on this module.
 */

import { admissionsServerEnabled } from "@/lib/admissions/config";
import type { AdmissionApplicationRecord, AdmissionStatus } from "@/lib/admissions/types";
import type { AdmissionSubmitInput } from "@/lib/admissions/types";

type Envelope<T> = { ok: boolean; error?: string } & Partial<T>;

/** Mutations need the double-submit CSRF header. */
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

export function admissionsEnabled() {
  return admissionsServerEnabled();
}

export async function apiSubmitAdmission(input: AdmissionSubmitInput) {
  return call<{ application: AdmissionApplicationRecord; created: boolean }>(
    "/api/admissions/submit",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function apiSaveAdmissionDraft(input: AdmissionSubmitInput) {
  return call<{ application: AdmissionApplicationRecord }>("/api/admissions/draft", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiListFamilyAdmissions() {
  return call<{ applications: AdmissionApplicationRecord[] }>("/api/admissions/family");
}

export async function apiListResidenceAdmissions(siteId?: string) {
  const qs = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
  return call<{ applications: AdmissionApplicationRecord[]; siteIds: string[] }>(
    `/api/admissions/residence${qs}`,
  );
}

export async function apiWithdrawAdmission(applicationId: string) {
  return call<{ application: AdmissionApplicationRecord }>(
    `/api/admissions/${encodeURIComponent(applicationId)}/withdraw`,
    { method: "POST" },
  );
}

export async function apiChangeAdmissionStatus(
  applicationId: string,
  status: AdmissionStatus,
  options: { note?: string | null; siteId?: string; waitlistPosition?: number | null } = {},
) {
  return call<{ application: AdmissionApplicationRecord }>(
    `/api/admissions/${encodeURIComponent(applicationId)}/status`,
    { method: "POST", body: JSON.stringify({ status, ...options }) },
  );
}
