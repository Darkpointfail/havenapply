-- ---------------------------------------------------------------------------
-- 0026 — documents_select: add is_site_staff alongside is_community_staff
--
-- Found by the RLS_MATRIX.md validation pass: documents_select (migration
-- 0006) grants staff read access to a shared document only through
-- is_community_staff(da.community_id), which resolves via
-- community_team_members — the table with no real writer since
-- staff_memberships (0011) took over (same root cause already fixed for
-- conversations/messages in 0022, and for has_community_permission() in
-- 0025, but documents_select itself was missed by both passes). Confirmed
-- empirically: a real staff account with a genuinely active, non-revoked
-- document_access grant for their own site could never read the document —
-- not "no grant, correctly refused" (scenario 4's stated case), but "grant
-- exists and is valid, refused anyway."
--
-- Same fix pattern as 0022: add `or is_site_staff(...)` alongside the
-- existing is_community_staff() check, inside the document_access exists()
-- clause — not replacing it, in case community_team_members is ever
-- populated again.
--
-- Rollback: drop the `or public.is_site_staff(da.community_id)` clause,
-- restoring documents_select to its 0006 body.
-- ---------------------------------------------------------------------------

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_family_member(family_id)
    or exists (
      select 1 from public.document_access da
      where da.document_id = documents.id
        and da.revoked_at is null
        and (
          public.is_community_staff(da.community_id)
          or public.is_site_staff(da.community_id)
        )
    )
  );
