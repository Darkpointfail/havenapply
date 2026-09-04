/**
 * Static verification of the RLS surface.
 *
 * No Supabase instance runs in CI, so these tests assert the migrations
 * themselves: every table holding identity, tenancy or personal data must have
 * row level security enabled and carry a policy that scopes reads to the owner
 * or to staff of the target site. Behavioural cross-tenant coverage lives in
 * `src/lib/admissions/tenancy.test.ts`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");

let sql = "";

beforeAll(async () => {
  const files = (await fs.readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  const parts = await Promise.all(
    files.map((f) => fs.readFile(path.join(MIGRATIONS, f), "utf8")),
  );
  sql = parts.join("\n");
});

const PROTECTED_TABLES = [
  // identity
  "auth_sessions",
  "staff_memberships",
  "staff_invitations",
  "security_audit_log",
  "auth_rate_limits",
  // domain
  "families",
  "family_members",
  "seniors",
  "applications",
  "application_status_history",
  "admissions_audit_log",
  "communities",
  "community_team_members",
];

describe("row level security", () => {
  it("enables RLS on every table holding identity or personal data", () => {
    const missing = PROTECTED_TABLES.filter(
      (table) => !sql.includes(`alter table public.${table} enable row level security`),
    );
    expect(missing).toEqual([]);
  });

  it("scopes session rows to their owner", () => {
    expect(sql).toContain("create policy auth_sessions_select on public.auth_sessions");
    expect(sql).toMatch(/auth_sessions_select[\s\S]*?user_id = auth\.uid\(\)/);
  });

  it("never lets a client insert a session, an audit row or a rate-limit row", () => {
    for (const table of ["auth_sessions", "security_audit_log", "auth_rate_limits"]) {
      expect(sql).not.toMatch(new RegExp(`create policy \\w+ on public\\.${table}\\s+for insert`));
    }
  });

  it("scopes staff memberships and invitations to the site", () => {
    expect(sql).toMatch(/staff_memberships_select[\s\S]*?is_site_staff\(community_id\)/);
    expect(sql).toMatch(/staff_memberships_write[\s\S]*?is_site_admin\(community_id\)/);
    expect(sql).toMatch(/staff_invitations_select[\s\S]*?is_site_admin\(community_id\)/);
  });

  it("scopes applications to the owning family or the targeted site", () => {
    expect(sql).toMatch(/applications_select[\s\S]*?is_family_member\(family_id\)/);
    expect(sql).toMatch(/applications_select[\s\S]*?is_site_staff\(community_id\)/);
    expect(sql).toMatch(/applications_update_staff[\s\S]*?is_site_staff\(community_id\)/);
  });

  it("refuses an application targeting a site that is not accepting", () => {
    expect(sql).toMatch(/applications_insert[\s\S]*?site_accepts_applications\(community_id\)/);
  });

  it("keeps membership helpers security definer with a pinned search_path", () => {
    for (const fn of ["is_site_staff", "is_site_admin"]) {
      const definition = sql.slice(sql.indexOf(`function public.${fn}(`));
      expect(definition.slice(0, 400)).toContain("security definer");
      expect(definition.slice(0, 400)).toContain("set search_path = public");
    }
  });

  it("stores invited addresses hashed, never in clear text", () => {
    expect(sql).toContain("email_hash text not null");
    expect(sql).not.toMatch(/create table if not exists public\.staff_invitations[\s\S]*?\n\s+email text/);
  });
});
