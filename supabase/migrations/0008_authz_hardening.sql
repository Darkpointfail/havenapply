-- HavenApply 0008: authorization hardening
-- Active profile checks, support break-glass grants, super-admin vs support,
-- application AuthZ helpers, invitation expiry.

-- ---------------------------------------------------------------------------
-- Profile / platform helpers (before policies that depend on them)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_profile(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_profile()
    and exists (
      select 1 from public.platform_roles pr
      where pr.user_id = auth.uid()
        and pr.role = 'super_admin'
    );
$$;

-- Full platform admin = super_admin only (support must use grants).
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin();
$$;

-- ---------------------------------------------------------------------------
-- Support access grants (break-glass)
-- ---------------------------------------------------------------------------
create table if not exists public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  grantee_user_id uuid not null references public.profiles (id) on delete cascade,
  granted_by_user_id uuid not null references public.profiles (id),
  target_type text not null check (target_type in (
    'family', 'senior_dossier', 'document', 'application',
    'message', 'community_workspace', 'platform_user', 'support_grant'
  )),
  target_tenant_id uuid not null,
  justification text not null check (char_length(trim(justification)) >= 12),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint support_access_grants_future_expiry check (expires_at > created_at)
);

create index if not exists support_access_grants_grantee_idx
  on public.support_access_grants (grantee_user_id)
  where revoked_at is null;

alter table public.support_access_grants enable row level security;

drop policy if exists support_access_grants_admin on public.support_access_grants;
create policy support_access_grants_admin on public.support_access_grants
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.has_valid_support_grant(
  p_target_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_profile()
    and exists (
      select 1
      from public.platform_roles pr
      where pr.user_id = auth.uid()
        and pr.role in ('support', 'ops', 'moderator')
    )
    and exists (
      select 1
      from public.support_access_grants g
      where g.grantee_user_id = auth.uid()
        and g.target_tenant_id = p_target_tenant_id
        and g.revoked_at is null
        and g.expires_at > timezone('utc', now())
    );
$$;

-- ---------------------------------------------------------------------------
-- Membership helpers with active profile + support grant paths
-- ---------------------------------------------------------------------------
create or replace function public.is_family_member(
  p_family_id uuid,
  p_min_role public.family_member_role default 'viewer'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_profile()
    and (
      exists (
        select 1
        from public.family_members fm
        where fm.family_id = p_family_id
          and fm.user_id = auth.uid()
          and fm.invitation_status = 'accepted'
          and public.family_role_rank(fm.role) >= public.family_role_rank(p_min_role)
      )
      or public.is_super_admin()
      or public.has_valid_support_grant(p_family_id)
    );
$$;

create or replace function public.is_community_staff(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_profile()
    and (
      exists (
        select 1
        from public.communities c
        join public.community_team_members ctm
          on ctm.organization_id = c.organization_id
         and ctm.user_id = auth.uid()
         and ctm.status = 'active'
         and (ctm.community_id is null or ctm.community_id = c.id)
        where c.id = p_community_id
      )
      or public.is_super_admin()
      or public.has_valid_support_grant(p_community_id)
    );
$$;

create or replace function public.has_community_permission(
  p_community_id uuid,
  p_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.community_team_role;
begin
  if not public.is_active_profile() then
    return false;
  end if;

  if public.is_super_admin() then
    return true;
  end if;

  if public.has_valid_support_grant(p_community_id) then
    return p_permission in ('view_applications', 'add_internal_notes');
  end if;

  select ctm.role into v_role
  from public.communities c
  join public.community_team_members ctm
    on ctm.organization_id = c.organization_id
   and ctm.user_id = auth.uid()
   and ctm.status = 'active'
   and (ctm.community_id is null or ctm.community_id = c.id)
  where c.id = p_community_id
  order by case ctm.role
    when 'org_admin' then 4
    when 'admissions_manager' then 3
    when 'admissions_staff' then 2
    else 1
  end desc
  limit 1;

  if v_role is null then
    return false;
  end if;

  return case p_permission
    when 'view_applications' then v_role in ('org_admin', 'admissions_manager', 'admissions_staff', 'readonly')
    when 'add_internal_notes' then v_role in ('org_admin', 'admissions_manager', 'admissions_staff')
    when 'request_documents' then v_role in ('org_admin', 'admissions_manager', 'admissions_staff')
    when 'propose_tour' then v_role in ('org_admin', 'admissions_manager', 'admissions_staff')
    when 'change_status' then v_role in ('org_admin', 'admissions_manager')
    when 'accept_decline' then v_role in ('org_admin', 'admissions_manager')
    when 'edit_profile' then v_role in ('org_admin', 'admissions_manager')
    when 'edit_availability' then v_role in ('org_admin', 'admissions_manager')
    when 'manage_team' then v_role = 'org_admin'
    else false
  end;
end;
$$;

create or replace function public.can_read_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    where a.id = p_application_id
      and (
        public.is_family_member(a.family_id)
        or public.is_community_staff(a.community_id)
      )
  );
$$;

create or replace function public.can_write_application_family(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    where a.id = p_application_id
      and public.is_family_editor(a.family_id)
  );
$$;

create or replace function public.can_act_on_application_staff(
  p_application_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    where a.id = p_application_id
      and public.has_community_permission(a.community_id, p_permission)
  );
$$;

create or replace function public.expire_stale_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_n integer;
begin
  update public.family_invitations
  set status = 'expired'
  where status = 'pending'
    and expires_at < timezone('utc', now());
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  update public.community_team_members
  set status = 'removed'
  where status = 'invited'
    and created_at < timezone('utc', now()) - interval '7 days';
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  return v_count;
end;
$$;

drop policy if exists platform_roles_admin on public.platform_roles;
create policy platform_roles_admin on public.platform_roles
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
