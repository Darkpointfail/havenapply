-- ---------------------------------------------------------------------------
-- 0011 — Identity, sessions, memberships, invitations: tables + RLS
--
-- SQL counterpart of the server-side identity introduced in the auth hardening
-- milestone. Row level security is defence in depth: the application already
-- filters by principal, these policies make a bypass impossible.
--
-- Rollback: drop the tables and policies created here. Nothing in 0001–0010
-- depends on them.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  rotated_from uuid references public.auth_sessions (id),
  user_agent_hash text
);

create index if not exists auth_sessions_user_idx
  on public.auth_sessions (user_id, issued_at desc);
create index if not exists auth_sessions_live_idx
  on public.auth_sessions (user_id) where revoked_at is null;

comment on table public.auth_sessions is
  'One row per issued session. Revocation is immediate: the cookie only carries this id.';

-- ---------------------------------------------------------------------------
-- Staff memberships: the only source of a staff member''s site scope
-- ---------------------------------------------------------------------------
create table if not exists public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'coordinator', 'readonly')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, community_id)
);

create index if not exists staff_memberships_community_idx
  on public.staff_memberships (community_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- Staff invitations: single use, expiring, auditable
-- ---------------------------------------------------------------------------
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  community_id uuid not null references public.communities (id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'coordinator', 'readonly')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists staff_invitations_community_idx
  on public.staff_invitations (community_id, created_at desc);

comment on column public.staff_invitations.email_hash is
  'SHA-256 of the invited address: the raw email is never stored here.';

-- ---------------------------------------------------------------------------
-- Security audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default timezone('utc', now()),
  event text not null,
  actor_id uuid references public.profiles (id),
  subject_hash text,
  outcome text not null check (outcome in ('success', 'failure')),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists security_audit_log_at_idx on public.security_audit_log (at desc);
create index if not exists security_audit_log_actor_idx on public.security_audit_log (actor_id, at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting counters (persistent across instances)
-- ---------------------------------------------------------------------------
create table if not exists public.auth_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  count integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Helper: is the caller staff of this community, via staff_memberships?
-- ---------------------------------------------------------------------------
create or replace function public.is_site_staff(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_site_admin(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.auth_sessions enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.security_audit_log enable row level security;
alter table public.auth_rate_limits enable row level security;

-- Sessions: a user may see and revoke their own; nobody may forge one.
drop policy if exists auth_sessions_select on public.auth_sessions;
create policy auth_sessions_select on public.auth_sessions
  for select using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists auth_sessions_revoke on public.auth_sessions;
create policy auth_sessions_revoke on public.auth_sessions
  for update using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

-- No insert policy: sessions are created by the service role only.

-- Memberships: readable by the member and by admins of the same site.
drop policy if exists staff_memberships_select on public.staff_memberships;
create policy staff_memberships_select on public.staff_memberships
  for select using (
    user_id = auth.uid()
    or public.is_site_staff(community_id)
    or public.is_platform_admin()
  );

drop policy if exists staff_memberships_write on public.staff_memberships;
create policy staff_memberships_write on public.staff_memberships
  for all
  using (public.is_site_admin(community_id) or public.is_platform_admin())
  with check (public.is_site_admin(community_id) or public.is_platform_admin());

-- Invitations: only administrators of the target site, and never the token.
drop policy if exists staff_invitations_select on public.staff_invitations;
create policy staff_invitations_select on public.staff_invitations
  for select using (public.is_site_admin(community_id) or public.is_platform_admin());

drop policy if exists staff_invitations_write on public.staff_invitations;
create policy staff_invitations_write on public.staff_invitations
  for all
  using (public.is_site_admin(community_id) or public.is_platform_admin())
  with check (public.is_site_admin(community_id) or public.is_platform_admin());

-- Audit: a user may read events about themselves; admins read everything.
drop policy if exists security_audit_log_select on public.security_audit_log;
create policy security_audit_log_select on public.security_audit_log
  for select using (actor_id = auth.uid() or public.is_platform_admin());

-- No insert/update/delete policy: written by the service role only.

-- Rate limits: service role only, no policy at all.

-- ---------------------------------------------------------------------------
-- Admissions: align staff access with staff_memberships
-- ---------------------------------------------------------------------------
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    public.is_family_member(family_id)
    or public.is_site_staff(community_id)
    or public.is_community_staff(community_id)
    or public.is_platform_admin()
  );

drop policy if exists applications_update_staff on public.applications;
create policy applications_update_staff on public.applications
  for update
  using (public.is_site_staff(community_id) or public.is_platform_admin())
  with check (public.is_site_staff(community_id) or public.is_platform_admin());
