"use client";

/**
 * Browser client for the staff/team API. Mirrors admissions/client-api.ts and
 * community-profile/client-api.ts's call()/csrfHeader() pattern.
 *
 * Two role vocabularies meet at this boundary: `staff_memberships.role`
 * (admin | manager | coordinator | readonly — migration 0011, also what
 * myRole/`can()` in community-portal-store.tsx already use) is what the
 * server actually stores and enforces. `CommunityTeamRole` (community-portal.ts)
 * is a wider, UI-facing enum (admin | admissions_manager | sales_counselor |
 * nurse_reviewer | readonly) kept as-is here — it's the client type/dropdown,
 * out of scope for this backend-only fix. toServerRole/toClientRole below do
 * the (lossy for the two roles the UI never offers) conversion so neither
 * side has to change.
 */
import type { CommunityTeamRole } from "@/lib/community-portal";
import type { StaffMembershipRecord, TeamMemberRecord } from "@/lib/security/identity-store";

export type { TeamMemberRecord };

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

export type ServerStaffRole = StaffMembershipRecord["role"];

/** UI role → what staff_memberships actually stores. */
export function toServerRole(role: CommunityTeamRole): ServerStaffRole {
  switch (role) {
    case "admin":
      return "admin";
    case "admissions_manager":
      return "manager";
    case "sales_counselor":
    case "nurse_reviewer":
      return "coordinator";
    case "readonly":
    default:
      return "readonly";
  }
}

/** staff_memberships role → the UI type, for displaying a fetched member. */
export function toClientRole(role: ServerStaffRole): CommunityTeamRole {
  switch (role) {
    case "admin":
      return "admin";
    case "manager":
      return "admissions_manager";
    case "coordinator":
      return "sales_counselor";
    case "readonly":
    default:
      return "readonly";
  }
}

export async function apiListTeam(siteId: string): Promise<TeamMemberRecord[]> {
  const res = await call<{ team: TeamMemberRecord[] }>(
    `/api/staff/team?siteId=${encodeURIComponent(siteId)}`,
  );
  return res?.ok ? (res.team ?? []) : [];
}

export async function apiUpdateTeamRole(
  siteId: string,
  userId: string,
  role: CommunityTeamRole,
): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ member: StaffMembershipRecord }>("/api/staff/team/role", {
    method: "POST",
    body: JSON.stringify({ siteId, userId, role: toServerRole(role) }),
  });
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, error: res.error };
}

export async function apiSetTeamMemberStatus(
  siteId: string,
  userId: string,
  status: "active" | "suspended",
): Promise<{ ok: boolean; error?: string }> {
  const res = await call<Record<string, never>>("/api/staff/team/status", {
    method: "POST",
    body: JSON.stringify({ siteId, userId, status }),
  });
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, error: res.error };
}

export async function apiInviteTeamMember(
  siteId: string,
  email: string,
  role: CommunityTeamRole,
): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ invitationId: string; expiresAt: string }>("/api/staff/invitations", {
    method: "POST",
    body: JSON.stringify({ siteId, email, role: toServerRole(role) }),
  });
  if (!res) return { ok: false, error: "Network error." };
  return { ok: res.ok, error: res.error };
}
