-- ---------------------------------------------------------------------------
-- 0010 — Admissions server flow
--
-- Replaces the `haven-shared-admissions-v2` localStorage bridge with a server
-- source of truth. Additive only: builds on `applications` (0004),
-- `application_status_history` (0004) and `community_team_members` (0003).
--
-- Rollback: drop the objects created here; 0004/0006 behaviour is unchanged.
-- See docs/architecture/ADMISSIONS_SERVER_FLOW.md
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Idempotency + seed marking on applications
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists client_request_id text;

alter table public.applications
  add column if not exists is_seed boolean not null default false;

-- Denormalized admissions payload (senior snapshot, care needs, document
-- metadata, family contact) so a residence can read a submission without
-- reaching into the family vault. Document bytes are never stored here.
alter table public.applications
  add column if not exists admissions_payload jsonb not null default '{}'::jsonb;

comment on column public.applications.admissions_payload is
  'Snapshot shared with the target site at submission time. Metadata only, no document bytes.';
comment on column public.applications.client_request_id is
  'Client-generated idempotency key. Unique per family: replaying a submit returns the same row.';
comment on column public.applications.is_seed is
  'True for explicitly seeded development data. Never set in production.';

-- Idempotency is scoped to the owning family so two families cannot collide.
-- The index is deliberately not partial: `on conflict (family_id,
-- client_request_id)` cannot infer a partial index, and NULL keys stay
-- distinct anyway, so drafts without a request id are unaffected.
drop index if exists public.applications_family_client_request_idx;
create unique index if not exists applications_family_client_request_idx
  on public.applications (family_id, client_request_id);

-- ---------------------------------------------------------------------------
-- Intake switch per community (an inactive residence refuses new applications)
-- ---------------------------------------------------------------------------
create table if not exists public.site_admissions_settings (
  community_id uuid primary key references public.communities (id) on delete cascade,
  is_active boolean not null default true,
  paused_reason text,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_admissions_settings is
  'Per-site intake switch. Absent row means active.';

-- ---------------------------------------------------------------------------
-- Per-application staff audit trail
--
-- `audit_logs` (0005) is platform-wide and admin-only readable. Admissions needs
-- an audit that the family owner and the target site staff can both read.
-- ---------------------------------------------------------------------------
create table if not exists public.admissions_audit_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  actor_type text not null check (actor_type in ('family', 'staff', 'system')),
  actor_id uuid references public.profiles (id),
  actor_label text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admissions_audit_log_app_idx
  on public.admissions_audit_log (application_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.site_admissions_settings enable row level security;
alter table public.admissions_audit_log enable row level security;

-- Intake switch: readable by anyone who can browse the site, writable by staff
-- holding the community `manage_profile` permission.
drop policy if exists site_admissions_settings_select on public.site_admissions_settings;
create policy site_admissions_settings_select on public.site_admissions_settings
  for select using (true);

-- `paused_reason` carries an internal note. RLS cannot scope a single column,
-- so the switch stays world-readable while the reason needs a session: the
-- table grant is replaced by a column grant for `anon`.
revoke select on public.site_admissions_settings from anon;
grant select (community_id, is_active, updated_at) on public.site_admissions_settings to anon;

drop policy if exists site_admissions_settings_write on public.site_admissions_settings;
create policy site_admissions_settings_write on public.site_admissions_settings
  for all
  using (public.has_community_permission(community_id, 'manage_profile') or public.is_platform_admin())
  with check (public.has_community_permission(community_id, 'manage_profile') or public.is_platform_admin());

-- Audit: readable by whoever may read the application; never written from the
-- client. Inserts go through the service role / security-definer functions.
drop policy if exists admissions_audit_log_select on public.admissions_audit_log;
create policy admissions_audit_log_select on public.admissions_audit_log
  for select using (public.can_read_application(application_id));

-- No insert/update/delete policy on purpose: the trail is append-only and is
-- written through `record_admissions_event` below, never by a direct insert.

create or replace function public.record_admissions_event(
  p_application_id uuid,
  p_actor_type text,
  p_actor_label text,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_read_application(p_application_id) then
    raise exception 'Not authorised for this application.' using errcode = '42501';
  end if;

  insert into public.admissions_audit_log
    (application_id, actor_type, actor_id, actor_label, action, metadata)
  values
    (p_application_id, p_actor_type, auth.uid(), p_actor_label, p_action,
     coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.record_admissions_event(uuid, text, text, text, jsonb) is
  'Append one audit entry for an application the caller may read. The actor is taken from the session, never from the argument list.';

grant execute on function public.record_admissions_event(uuid, text, text, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten status history: history is append-only and never client-written.
-- ---------------------------------------------------------------------------
drop policy if exists application_status_history_insert on public.application_status_history;
drop policy if exists application_status_history_update on public.application_status_history;
drop policy if exists application_status_history_delete on public.application_status_history;

-- ---------------------------------------------------------------------------
-- Helper: can this site accept a new application right now?
-- ---------------------------------------------------------------------------
create or replace function public.site_accepts_applications(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.communities c
      where c.id = p_community_id
        and c.deleted_at is null
        and c.status = 'verified'
    )
    and coalesce(
      (select s.is_active from public.site_admissions_settings s where s.community_id = p_community_id),
      true
    );
$$;

comment on function public.site_accepts_applications(uuid) is
  'True when the community exists, is active and has not paused intake.';

-- Refuse inserts targeting a site that is not accepting applications.
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert
  with check (
    public.is_family_editor(family_id)
    and public.site_accepts_applications(community_id)
  );
