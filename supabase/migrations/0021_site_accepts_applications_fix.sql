-- HavenApply 0021: fix site_accepts_applications() checking a community_status
-- value that does not exist.
--
-- Pre-existing bug, unrelated to today's RPA import: site_accepts_applications()
-- (migration 0010), used by the applications_insert RLS policy, checks
-- `c.status = 'active'` — 'active' is not a value of the community_status enum
-- (draft | pending_review | verified | suspended | closed, migration 0001).
-- Confirmed empirically: the function returns false unconditionally for every
-- community regardless of real status, so applications_insert has been
-- rejecting every real application submission in Supabase mode since 0010 was
-- applied, verified clients included — not just the new RPA-imported rows.
--
-- Same "verified" vs "active" drift already fixed once in
-- admissions/supabase-store.ts#getSite() (see that function's comment and
-- claude/audit-etat-supabase-phase-b-2026-09-10.md); this migration makes the
-- RLS-level check agree with it, including the pending_review + external_ref
-- case (migration 0019/0020) so an unclaimed RPA residence can still receive
-- a dossier.
--
-- Rollback: restore this function's body to check `c.status = 'active'`
-- (not recommended — that is the bug).

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
        and (
          c.status = 'verified'
          or (c.status = 'pending_review' and c.external_ref is not null)
        )
    )
    and coalesce(
      (select s.is_active from public.site_admissions_settings s where s.community_id = p_community_id),
      true
    );
$$;
