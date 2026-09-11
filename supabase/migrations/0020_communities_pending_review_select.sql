-- HavenApply 0020: let an authenticated caller read an imported, unclaimed
-- community when submitting a dossier to it.
--
-- communities_public_select (migration 0006) only allows anonymous/public
-- reads when status = 'verified'. The Québec RPA registry import (migration
-- 0019 + scripts/import-rpa-communities.mjs, 1328 rows) uses
-- status = 'pending_review' deliberately, so those residences stay out of
-- public find-senior-living/compare results (src/lib/admissions/public-registry.ts
-- filters explicitly on status = 'verified' too — defence in depth, this
-- policy change alone does not make them publicly listed). But a signed-in
-- family submitting an application needs admissions/supabase-store.ts#getSite()
-- to be able to read the row at all, which RLS was blocking outright before
-- this change (confirmed empirically: an authenticated non-staff caller got
-- zero rows back for a pending_review + external_ref community).
--
-- Rollback: re-apply migration 0006's original communities_public_select
-- policy body (drop the "or (status = 'pending_review' and external_ref is not null)" clause).

drop policy if exists communities_public_select on public.communities;
create policy communities_public_select on public.communities
  for select using (
    (status = 'verified' and deleted_at is null)
    or (status = 'pending_review' and external_ref is not null and deleted_at is null)
    or public.is_community_staff(id)
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );
