-- HavenApply 0022: fix conversations/messages RLS checking a stale staff table.
--
-- Pre-existing bug, unrelated to Étape C (email) or the RPA import — found
-- while testing the new "staff message → family email" trigger.
--
-- is_community_staff(p_community_id) (migration 0006) checks
-- community_team_members (migration 0003) for an active row. Real staff
-- access has lived in staff_memberships since migration 0011 — confirmed
-- there is no writer to community_team_members anywhere in the current
-- codebase (bootstrap, invitations, claim all write staff_memberships only).
-- applications_select was already patched to also check is_site_staff()
-- (the staff_memberships-backed equivalent, migration 0011) in the tail of
-- migration 0006 itself ("Admissions: align staff access with
-- staff_memberships") — conversations_select/_insert and messages_select/_insert
-- were missed in that pass and still only check is_community_staff(),
-- so a real staff account (created via any path this session already fixed —
-- bootstrap, invitations) could authenticate and pass application-level authz,
-- then get "new row violates row-level security policy for table
-- conversations" the moment it tried to message a family. Confirmed
-- empirically: community_team_members is empty for a real, active
-- staff_memberships row.
--
-- Rollback: re-apply migration 0006's original bodies for these 4 policies
-- (drop the "or public.is_site_staff(...)" clauses).

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select using (
    public.is_family_member(family_id)
    or public.is_community_staff(community_id)
    or public.is_site_staff(community_id)
  );

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert with check (
    public.is_family_member(family_id)
    or public.is_community_staff(community_id)
    or public.is_site_staff(community_id)
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          public.is_family_member(c.family_id)
          or public.is_community_staff(c.community_id)
          or public.is_site_staff(c.community_id)
        )
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          public.is_family_member(c.family_id)
          or public.is_community_staff(c.community_id)
          or public.is_site_staff(c.community_id)
        )
    )
  );
