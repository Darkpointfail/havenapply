-- ---------------------------------------------------------------------------
-- 0025 — Availability schema extension + has_community_permission() fix
--
-- Part 1: public.availability (0003) only carries care_level/available_rooms/
-- waitlist — the client AvailabilityUnit type also needs roomType,
-- availableDate, price, status. Additive, all nullable: no data loss, no
-- backfill required for existing rows.
--
-- Part 2: has_community_permission() (0006) still resolves role via
-- community_team_members (0003) — the table with no real writer since
-- staff_memberships (0011) took over (same root cause as is_community_staff,
-- fixed for messaging in 0022, but that pass only added an is_site_staff
-- companion policy and never touched this function itself). It currently
-- gates communities_write / community_services_write /
-- community_amenities_write / community_rooms_write /
-- admission_requirements_write / tours_write / the applications_update_family
-- change_status fallback / community_intake_queue (unused RPC) — and, as of
-- this migration, availability_write, the first real write path in that list
-- to actually be exercised by the app. Left unfixed, no real (non-platform-
-- admin) staff member could ever save availability.
--
-- Role mapping mirrors two precedents already shipped elsewhere in this
-- codebase: guards.ts's DECIDING_ROLES (admin/manager/coordinator can act on
-- an application; readonly cannot) and community-portal.ts's ROLE_PERMS
-- (only admin has editProfile/manageTeam; admin+manager have editAvailability).
--
-- 'manage_profile' (site_admissions_settings_write, migration 0010) was
-- missing from the first draft of this function and would have silently
-- fallen through to `else false` — caught before application. It gates the
-- per-site intake pause/resume switch (site_admissions_settings.is_active,
-- read by site_accepts_applications(), migration 0021). Scoped to
-- admin+manager, not admin-only like edit_profile: updateProfile()
-- (community-portal-store.tsx) already lets anyone with can("acceptDecline")
-- toggle acceptingApplications, and admissions_manager (-> manager) holds
-- that permission per community-portal.ts's ROLE_PERMS.
--
-- Rollback: revert availability's 4 new columns with `alter table
-- public.availability drop column ...`; restore has_community_permission()'s
-- prior body (git history, migration 0006) to roll back part 2 alone.
-- ---------------------------------------------------------------------------

alter table public.availability
  add column if not exists room_type text,
  add column if not exists available_date date,
  add column if not exists price numeric(12, 2),
  add column if not exists status text;

alter table public.availability
  drop constraint if exists availability_status_check;
alter table public.availability
  add constraint availability_status_check
  check (status is null or status in ('confirmed', 'estimated'));

comment on column public.availability.room_type is 'Free-text room/unit label, e.g. "Studio", "1 bedroom".';
comment on column public.availability.available_date is 'Earliest move-in date for this care-level bucket, if known.';
comment on column public.availability.price is 'Monthly price for this care-level bucket, if published.';
comment on column public.availability.status is 'confirmed | estimated — null means not yet set by staff.';

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
  v_role text;
begin
  if public.is_platform_admin() then
    return true;
  end if;

  select m.role into v_role
  from public.staff_memberships m
  where m.community_id = p_community_id
    and m.user_id = auth.uid()
    and m.status = 'active';

  if v_role is null then
    return false;
  end if;

  return case p_permission
    when 'view_applications' then v_role in ('admin', 'manager', 'coordinator', 'readonly')
    when 'add_internal_notes' then v_role in ('admin', 'manager', 'coordinator')
    when 'request_documents' then v_role in ('admin', 'manager', 'coordinator')
    when 'propose_tour' then v_role in ('admin', 'manager', 'coordinator')
    when 'change_status' then v_role in ('admin', 'manager', 'coordinator')
    when 'accept_decline' then v_role in ('admin', 'manager')
    when 'edit_profile' then v_role = 'admin'
    when 'edit_availability' then v_role in ('admin', 'manager')
    when 'manage_team' then v_role = 'admin'
    when 'manage_profile' then v_role in ('admin', 'manager')
    else false
  end;
end;
$$;
