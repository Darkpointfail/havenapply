-- HavenApply 0023: capture the real note on a status transition.
--
-- on_application_status_change() (migration 0007) always inserted
-- application_status_history.note as a hardcoded null. admissions/supabase-store.ts
-- #changeStatus() already stores the actual request/decision text in
-- applications.admissions_payload.decision.note whenever a decisionKind is
-- set (accept, decline, request info, request document, propose tour,
-- propose assessment — see decisionKindForStatus() in admissions/mapping.ts)
-- — the trigger just never read it. Confirmed empirically: the family-side
-- sync in family-data.tsx reads status history's note and always fell back
-- to a generic "the residence updated this application" string as a result.
--
-- The comparison against old.admissions_payload->'decision' matters: a
-- status change that does NOT set a new decisionKind (e.g. a plain
-- "under_review" transition) leaves admissions_payload.decision unchanged
-- from the previous transition — without this comparison the trigger would
-- misattribute a stale, unrelated note to the new status_history row.
--
-- Rollback: restore this function's body to insert `note` as a literal null.

create or replace function public.on_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_note := case
      when new.admissions_payload -> 'decision' is distinct from old.admissions_payload -> 'decision'
        then new.admissions_payload -> 'decision' ->> 'note'
      else null
    end;

    insert into public.application_status_history (
      application_id, from_status, to_status, changed_by, note
    ) values (
      new.id, old.status, new.status, auth.uid(), v_note
    );

    insert into public.application_timeline (
      application_id, event_type, description, created_by, metadata
    ) values (
      new.id,
      'status_changed',
      format('Status changed from %s to %s', old.status, new.status),
      auth.uid(),
      jsonb_build_object('from', old.status, 'to', new.status)
    );

    new.last_activity_at := timezone('utc', now());

    perform public.enqueue_outbox(
      'application',
      new.id,
      'application.status_changed',
      jsonb_build_object(
        'application_id', new.id,
        'family_id', new.family_id,
        'community_id', new.community_id,
        'organization_id', new.organization_id,
        'from', old.status,
        'to', new.status
      ),
      format('application.status_changed:%s:%s:%s', new.id, old.status, new.status)
    );
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'draft'
     and new.status = 'submitted' then
    perform public.enqueue_outbox(
      'application',
      new.id,
      'application.submitted',
      jsonb_build_object(
        'application_id', new.id,
        'family_id', new.family_id,
        'community_id', new.community_id,
        'organization_id', new.organization_id
      ),
      format('application.submitted:%s', new.id)
    );
  end if;

  return new;
end;
$$;
