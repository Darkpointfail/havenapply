-- ---------------------------------------------------------------------------
-- 0024 — Internal notes on an application, staff-only
--
-- addInternalNote (community-portal-store.tsx) has only ever written to
-- localStorage: a note left by one employee is invisible to a colleague on
-- another device, or even the same device after a cache clear.
--
-- admissions_audit_log (0010) was considered and rejected: its own comment
-- says "the family owner and the target site staff can both read", and its
-- RLS policy (admissions_audit_log_select) uses can_read_application(), which
-- has no staff/family distinction — GET /api/admissions/[id] returns that
-- table's rows to both. A genuinely internal note would leak to the family
-- the moment it landed in the same `audit` field. This table is separate on
-- purpose: staff-only select, staff-only insert, and the RLS predicate below
-- proves it (no is_family_member anywhere in this file).
--
-- Immutable by design: no update/delete policy. A note, once written, stays;
-- correcting one means writing a new note, the same convention as
-- admissions_audit_log and application_status_history.
--
-- Rollback: drop table public.application_internal_notes.
-- ---------------------------------------------------------------------------

create table if not exists public.application_internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists application_internal_notes_app_idx
  on public.application_internal_notes (application_id, created_at desc);

comment on table public.application_internal_notes is
  'Staff-only notes on an application. Never readable by the family — see admissions_audit_log_select for the leak this avoids.';

alter table public.application_internal_notes enable row level security;

-- Select/insert: staff of the note's application's site only, via
-- staff_memberships (is_site_staff — migration 0011), the same helper
-- 0021/0022 use for applications/conversations/messages. No
-- is_family_member: that is the entire point of this table.
drop policy if exists application_internal_notes_select on public.application_internal_notes;
create policy application_internal_notes_select on public.application_internal_notes
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and public.is_site_staff(a.community_id)
    )
    or public.is_platform_admin()
  );

drop policy if exists application_internal_notes_insert on public.application_internal_notes;
create policy application_internal_notes_insert on public.application_internal_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and public.is_site_staff(a.community_id)
    )
  );

-- No update/delete policy on purpose: a note is immutable once written.
