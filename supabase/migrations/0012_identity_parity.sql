-- ---------------------------------------------------------------------------
-- 0012 — Identity parity between the application and Supabase
--
-- Until now the application's notion of "who is calling" lived in a filesystem
-- store keyed by `usr_<uuid>`. In Supabase mode that store is empty, so a
-- residence account resolved no membership and no scope. Worse, the caller's
-- role was read from `auth.users.user_metadata`, which the account holder can
-- rewrite with a single client call.
--
-- This migration anchors identity on the verified `auth.users.id`:
--
--   * `app_identities` holds the application role, server-side only;
--   * `legacy_user_id` records the deterministic mapping from the old
--     `usr_<uuid>` identifiers, one to one in both directions;
--   * `app_role()` reads the role from the session, never from an argument;
--   * `accept_staff_invitation()` consumes an invitation exactly once and
--     grants the membership in the same transaction.
--
-- Rollback: drop the objects created here. 0001–0011 do not depend on them.
-- See docs/architecture/IDENTITY_PARITY.md
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The anchor
-- ---------------------------------------------------------------------------
create table if not exists public.app_identities (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_role text not null default 'family'
    check (app_role in ('family', 'professional', 'facility', 'community', 'internal')),
  -- One legacy account maps to at most one Supabase user, and the primary key
  -- makes the reverse true as well: the correspondence is a bijection.
  legacy_user_id text unique,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.app_identities is
  'Application identity anchored on the verified auth.users id. The role lives here, never in user_metadata, which the account holder can edit.';
comment on column public.app_identities.legacy_user_id is
  'Former filesystem identifier (usr_<uuid>). Present only for accounts that predate Supabase identity; unique, so a migration cannot fan out.';

create index if not exists app_identities_role_idx
  on public.app_identities (app_role) where status = 'active';

-- ---------------------------------------------------------------------------
-- Every Supabase user starts as a family account
--
-- Sign-up metadata is client-controlled, so it cannot decide a role. Elevation
-- to a residence role happens by accepting an invitation, elevation to an
-- internal role only through the operator bootstrap path.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_app_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_identities (user_id, app_role)
  values (new.id, 'family')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_app_identity on auth.users;
create trigger on_auth_user_created_app_identity
  after insert on auth.users
  for each row execute function public.handle_new_app_identity();

-- ---------------------------------------------------------------------------
-- Accounts that already existed
--
-- The trigger only fires on new sign-ups, so without this every account made
-- before today would authenticate successfully and then resolve no role, which
-- is a lockout rather than a refusal. The role is derived from tables the
-- server controls — memberships and platform roles — and never from
-- `user_metadata`, which is exactly what this migration exists to stop trusting.
-- ---------------------------------------------------------------------------
insert into public.app_identities (user_id, app_role)
select
  u.id,
  case
    when exists (select 1 from public.platform_roles p where p.user_id = u.id)
      then 'internal'
    when exists (
      select 1 from public.staff_memberships m
       where m.user_id = u.id and m.status = 'active'
    ) then 'facility'
    when exists (
      select 1 from public.community_team_members t
       where t.user_id = u.id and t.status = 'active'
    ) then 'facility'
    else 'family'
  end
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Role of the caller, taken from the session
-- ---------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select i.app_role
  from public.app_identities i
  where i.user_id = auth.uid() and i.status = 'active';
$$;

comment on function public.app_role() is
  'Application role of the current session. Takes no argument on purpose: there is nothing a caller could substitute.';

revoke all on function public.app_role() from public;
grant execute on function public.app_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Accepting a staff invitation: single use, membership in the same transaction
-- ---------------------------------------------------------------------------
-- Dropped first so the migration stays re-runnable: a replace cannot
-- change the shape of what a function returns.
drop function if exists public.accept_staff_invitation(text);
create function public.accept_staff_invitation(p_token_hash text)
returns table (membership_id uuid, site_id uuid, membership_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invitation public.staff_invitations%rowtype;
  v_membership uuid;
  v_actor uuid;
begin
  if v_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- The conditional update is the single-use guarantee: two concurrent calls
  -- cannot both find the row unused.
  update public.staff_invitations
     set used_at = timezone('utc', now())
   where token_hash = p_token_hash
     and used_at is null
     and revoked_at is null
     and expires_at > timezone('utc', now())
  returning * into v_invitation;

  if not found then
    raise exception 'Invitation is not usable.' using errcode = '22023';
  end if;

  insert into public.staff_memberships (user_id, community_id, role)
  values (v_user, v_invitation.community_id, v_invitation.role)
  on conflict (user_id, community_id) do update
    set role = excluded.role, status = 'active'
  returning id into v_membership;

  update public.app_identities
     set app_role = case when app_role = 'internal' then app_role else 'facility' end,
         updated_at = timezone('utc', now())
   where user_id = v_user;

  select id into v_actor from public.profiles where id = v_user;
  insert into public.security_audit_log (event, actor_id, subject_hash, outcome, metadata)
  values (
    'staff.invitation.accepted',
    v_actor,
    v_invitation.email_hash,
    'success',
    jsonb_build_object('communityId', v_invitation.community_id, 'role', v_invitation.role)
  );

  return query select v_membership, v_invitation.community_id, v_invitation.role;
end;
$$;

comment on function public.accept_staff_invitation(text) is
  'Consumes one invitation for the caller and grants the membership atomically. The accepting account comes from the session, never from the request.';

revoke all on function public.accept_staff_invitation(text) from public;
grant execute on function public.accept_staff_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Deterministic migration of the legacy `usr_<uuid>` identifiers
--
-- Called once per legacy account by scripts/identity/migrate-legacy.mjs, which
-- resolves the Supabase user itself. Passing both sides explicitly keeps the
-- email matching in the migration, where it can be reviewed, and out of the
-- request path, where it never belongs.
-- ---------------------------------------------------------------------------
create or replace function public.link_legacy_identity(
  p_user_id uuid,
  p_legacy_user_id text,
  p_app_role text default null
)
returns public.app_identities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.app_identities%rowtype;
  v_conflict uuid;
begin
  if p_legacy_user_id is null or p_legacy_user_id = '' then
    raise exception 'A legacy identifier is required.' using errcode = '22023';
  end if;

  select user_id into v_conflict
    from public.app_identities
   where legacy_user_id = p_legacy_user_id and user_id <> p_user_id;
  if v_conflict is not null then
    raise exception 'Legacy identifier % is already linked to another account.', p_legacy_user_id
      using errcode = '23505';
  end if;

  insert into public.app_identities (user_id, legacy_user_id, app_role)
  values (p_user_id, p_legacy_user_id, coalesce(p_app_role, 'family'))
  on conflict (user_id) do update
    set legacy_user_id = excluded.legacy_user_id,
        app_role = coalesce(p_app_role, public.app_identities.app_role),
        updated_at = timezone('utc', now())
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.link_legacy_identity(uuid, text, text) from public;
-- Migration-time only: the service role runs it, no session ever should.

create or replace function public.unlink_legacy_identity(p_legacy_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.app_identities
     set legacy_user_id = null, updated_at = timezone('utc', now())
   where legacy_user_id = p_legacy_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.unlink_legacy_identity(text) from public;

-- ---------------------------------------------------------------------------
-- Rate limiting without a filesystem
--
-- The local adapter counts attempts in a JSON file. On Supabase the counter
-- must be shared by every instance, and read-modify-write over HTTP would race,
-- so the whole window fits in one statement.
-- ---------------------------------------------------------------------------
drop function if exists public.consume_auth_rate_limit(text, integer, integer);
create function public.consume_auth_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_started timestamptz;
  v_count integer;
begin
  insert into public.auth_rate_limits (key, window_started_at, count)
  values (p_key, timezone('utc', now()), 1)
  on conflict (key) do update
    set window_started_at = case
          when public.auth_rate_limits.window_started_at + v_window <= timezone('utc', now())
            then timezone('utc', now())
          else public.auth_rate_limits.window_started_at
        end,
        count = case
          when public.auth_rate_limits.window_started_at + v_window <= timezone('utc', now())
            then 1
          else public.auth_rate_limits.count + 1
        end
  returning public.auth_rate_limits.window_started_at, public.auth_rate_limits.count
  into v_started, v_count;

  if v_count > p_limit then
    return query select
      false,
      0,
      greatest(1, ceil(extract(epoch from (v_started + v_window - timezone('utc', now()))))::integer);
  else
    return query select true, p_limit - v_count, 0;
  end if;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.app_identities enable row level security;

-- A caller may read their own identity and nothing else. No insert, update or
-- delete policy: roles are granted server-side, never claimed.
drop policy if exists app_identities_select on public.app_identities;
create policy app_identities_select on public.app_identities
  for select using (user_id = auth.uid() or public.is_platform_admin());

-- The legacy identifier is migration bookkeeping, not something a session needs.
revoke select on public.app_identities from anon, authenticated;
grant select (user_id, app_role, status, created_at, updated_at)
  on public.app_identities to authenticated;
