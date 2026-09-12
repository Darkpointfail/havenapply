-- ---------------------------------------------------------------------------
-- 0027 — can_read_application(): add is_site_staff alongside is_community_staff
--
-- Found while retesting 0026: documents_select's new `or is_site_staff(...)`
-- clause was observably a no-op — a real staff account with a genuinely
-- active document_access grant still couldn't read the document. Root
-- cause was one level deeper than 0026 fixed: document_access_select
-- (migration 0006) gates document_access itself on can_read_application(),
-- and documents_select/document_access_logs_select both join through
-- document_access — so can_read_application() itself, still resolving
-- staff access via the dead is_community_staff() only, was blocking the
-- read before 0026's own OR clause on documents_select ever got a chance
-- to matter. 0026 was correct; it was waiting on this.
--
-- can_read_application() is not documents-specific — it also gates
-- admissions_audit_log_select, application_documents_all,
-- application_questions_all, application_timeline_select,
-- application_status_history_select and tours_select (all migration 0006,
-- admissions_audit_log_select in 0010). None of those six had any
-- alternative access path — can_read_application() was their only gate —
-- so all six were equally blocked for real (non-platform-admin) staff
-- until this migration, not just the documents/scenario-4 case that
-- surfaced the bug.
--
-- Same fix pattern as 0022/0026: add `or is_site_staff(...)` alongside the
-- existing is_community_staff() check, not replacing it.
--
-- Rollback: drop the `or public.is_site_staff(a.community_id)` clause,
-- restoring can_read_application() to its 0006 body.
-- ---------------------------------------------------------------------------

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
        or public.is_site_staff(a.community_id)
      )
  );
$$;
