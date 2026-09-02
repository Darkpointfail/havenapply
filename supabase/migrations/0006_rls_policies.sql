-- HavenApply 0006: RLS helpers + policies

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_roles pr
    where pr.user_id = auth.uid()
  );
$$;

create or replace function public.family_role_rank(r public.family_member_role)
returns integer
language sql
immutable
as $$
  select case r
    when 'viewer' then 1
    when 'financial' then 2
    when 'medical' then 2
    when 'editor' then 3
    when 'owner' then 4
    else 0
  end;
$$;

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
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.invitation_status = 'accepted'
      and public.family_role_rank(fm.role) >= public.family_role_rank(p_min_role)
  ) or public.is_platform_admin();
$$;

create or replace function public.is_family_editor(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_family_member(p_family_id, 'editor')
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = p_family_id
        and fm.user_id = auth.uid()
        and fm.invitation_status = 'accepted'
        and fm.role in ('medical', 'financial', 'editor', 'owner')
    )
    or public.is_platform_admin();
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_team_members ctm
    where ctm.organization_id = p_organization_id
      and ctm.user_id = auth.uid()
      and ctm.status = 'active'
  ) or exists (
    select 1 from public.organization_roles orl
    where orl.organization_id = p_organization_id
      and orl.user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_roles orl
    where orl.organization_id = p_organization_id
      and orl.user_id = auth.uid()
      and orl.role in ('org_owner', 'billing_admin')
  ) or exists (
    select 1 from public.community_team_members ctm
    where ctm.organization_id = p_organization_id
      and ctm.user_id = auth.uid()
      and ctm.status = 'active'
      and ctm.role = 'org_admin'
      and ctm.community_id is null
  ) or public.is_platform_admin();
$$;

create or replace function public.is_community_staff(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.communities c
    join public.community_team_members ctm
      on ctm.organization_id = c.organization_id
     and ctm.user_id = auth.uid()
     and ctm.status = 'active'
     and (ctm.community_id is null or ctm.community_id = c.id)
    where c.id = p_community_id
  ) or public.is_platform_admin();
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
  if public.is_platform_admin() then
    return true;
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

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.seniors enable row level security;
alter table public.senior_care_assessments enable row level security;
alter table public.senior_medical_conditions enable row level security;
alter table public.medications enable row level security;
alter table public.allergies enable row level security;
alter table public.documents enable row level security;
alter table public.document_access enable row level security;
alter table public.document_access_logs enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_roles enable row level security;
alter table public.communities enable row level security;
alter table public.community_services enable row level security;
alter table public.community_amenities enable row level security;
alter table public.community_rooms enable row level security;
alter table public.admission_requirements enable row level security;
alter table public.availability enable row level security;
alter table public.community_team_members enable row level security;
alter table public.favorites enable row level security;
alter table public.comparisons enable row level security;
alter table public.comparison_items enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_questions enable row level security;
alter table public.application_timeline enable row level security;
alter table public.application_status_history enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.tours enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.compatibility_analyses enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.community_embeddings enable row level security;
alter table public.senior_embeddings enable row level security;
alter table public.integration_providers enable row level security;
alter table public.organization_integrations enable row level security;
alter table public.webhook_events enable row level security;
alter table public.integration_logs enable row level security;
alter table public.outbox_events enable row level security;
alter table public.partners enable row level security;
alter table public.partner_services enable row level security;
alter table public.referrals enable row level security;
alter table public.quotes enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_platform_admin());

drop policy if exists platform_roles_admin on public.platform_roles;
create policy platform_roles_admin on public.platform_roles
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select using (public.is_family_member(id) or public.is_platform_admin());
drop policy if exists families_insert on public.families;
create policy families_insert on public.families
  for insert with check (owner_id = auth.uid());
drop policy if exists families_update on public.families;
create policy families_update on public.families
  for update using (public.is_family_member(id, 'owner') or public.is_platform_admin());

drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
  for select using (public.is_family_member(family_id) or user_id = auth.uid());
drop policy if exists family_members_write on public.family_members;
create policy family_members_write on public.family_members
  for all using (public.is_family_member(family_id, 'owner') or public.is_platform_admin())
  with check (public.is_family_member(family_id, 'owner') or public.is_platform_admin());

drop policy if exists family_invitations_select on public.family_invitations;
create policy family_invitations_select on public.family_invitations
  for select using (public.is_family_member(family_id) or public.is_platform_admin());
drop policy if exists family_invitations_write on public.family_invitations;
create policy family_invitations_write on public.family_invitations
  for all using (public.is_family_editor(family_id) or public.is_platform_admin())
  with check (public.is_family_editor(family_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seniors + related
-- ---------------------------------------------------------------------------
drop policy if exists seniors_select on public.seniors;
create policy seniors_select on public.seniors
  for select using (public.is_family_member(family_id));
drop policy if exists seniors_write on public.seniors;
create policy seniors_write on public.seniors
  for all using (public.is_family_editor(family_id))
  with check (public.is_family_editor(family_id));

drop policy if exists care_assessments_select on public.senior_care_assessments;
create policy care_assessments_select on public.senior_care_assessments
  for select using (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_member(s.family_id))
  );
drop policy if exists care_assessments_write on public.senior_care_assessments;
create policy care_assessments_write on public.senior_care_assessments
  for all using (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_editor(s.family_id))
  )
  with check (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_editor(s.family_id))
  );

drop policy if exists conditions_family on public.senior_medical_conditions;
create policy conditions_family on public.senior_medical_conditions
  for all using (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_member(s.family_id))
  )
  with check (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_editor(s.family_id))
  );

drop policy if exists medications_family on public.medications;
create policy medications_family on public.medications
  for all using (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_member(s.family_id))
  )
  with check (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_editor(s.family_id))
  );

drop policy if exists allergies_family on public.allergies;
create policy allergies_family on public.allergies
  for all using (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_member(s.family_id))
  )
  with check (
    exists (select 1 from public.seniors s where s.id = senior_id and public.is_family_editor(s.family_id))
  );

-- Documents: family OR active document_access for community staff
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_family_member(family_id)
    or exists (
      select 1 from public.document_access da
      where da.document_id = documents.id
        and da.revoked_at is null
        and public.is_community_staff(da.community_id)
    )
  );
drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents
  for all using (public.is_family_editor(family_id))
  with check (public.is_family_editor(family_id));

drop policy if exists document_access_select on public.document_access;
create policy document_access_select on public.document_access
  for select using (
    public.can_read_application(application_id)
  );
drop policy if exists document_access_write on public.document_access;
create policy document_access_write on public.document_access
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.is_family_editor(a.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.is_family_editor(a.family_id)
    )
  );

drop policy if exists document_access_logs_select on public.document_access_logs;
create policy document_access_logs_select on public.document_access_logs
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and (
        public.is_family_member(d.family_id)
        or exists (
          select 1 from public.document_access da
          where da.document_id = d.id and da.revoked_at is null
            and public.is_community_staff(da.community_id)
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Organizations / communities
-- ---------------------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id) or public.is_platform_admin());
drop policy if exists organizations_write on public.organizations;
create policy organizations_write on public.organizations
  for all using (public.is_org_admin(id) or public.is_platform_admin())
  with check (public.is_org_admin(id) or public.is_platform_admin());

drop policy if exists organization_settings_select on public.organization_settings;
create policy organization_settings_select on public.organization_settings
  for select using (public.is_org_member(organization_id));
drop policy if exists organization_settings_write on public.organization_settings;
create policy organization_settings_write on public.organization_settings
  for all using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists organization_roles_all on public.organization_roles;
create policy organization_roles_all on public.organization_roles
  for all using (public.is_org_admin(organization_id) or public.is_platform_admin())
  with check (public.is_org_admin(organization_id) or public.is_platform_admin());

drop policy if exists communities_public_select on public.communities;
create policy communities_public_select on public.communities
  for select using (
    (status = 'verified' and deleted_at is null)
    or public.is_community_staff(id)
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );
drop policy if exists communities_write on public.communities;
create policy communities_write on public.communities
  for all using (
    public.has_community_permission(id, 'edit_profile')
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  )
  with check (
    public.is_org_member(organization_id) or public.is_platform_admin()
  );

drop policy if exists community_services_select on public.community_services;
create policy community_services_select on public.community_services
  for select using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.status = 'verified' or public.is_community_staff(c.id))
    )
  );
drop policy if exists community_services_write on public.community_services;
create policy community_services_write on public.community_services
  for all using (public.has_community_permission(community_id, 'edit_profile'))
  with check (public.has_community_permission(community_id, 'edit_profile'));

drop policy if exists community_amenities_select on public.community_amenities;
create policy community_amenities_select on public.community_amenities
  for select using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.status = 'verified' or public.is_community_staff(c.id))
    )
  );
drop policy if exists community_amenities_write on public.community_amenities;
create policy community_amenities_write on public.community_amenities
  for all using (public.has_community_permission(community_id, 'edit_profile'))
  with check (public.has_community_permission(community_id, 'edit_profile'));

drop policy if exists community_rooms_select on public.community_rooms;
create policy community_rooms_select on public.community_rooms
  for select using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.status = 'verified' or public.is_community_staff(c.id))
    )
  );
drop policy if exists community_rooms_write on public.community_rooms;
create policy community_rooms_write on public.community_rooms
  for all using (public.has_community_permission(community_id, 'edit_availability'))
  with check (public.has_community_permission(community_id, 'edit_availability'));

drop policy if exists admission_requirements_select on public.admission_requirements;
create policy admission_requirements_select on public.admission_requirements
  for select using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.status = 'verified' or public.is_community_staff(c.id))
    )
  );
drop policy if exists admission_requirements_write on public.admission_requirements;
create policy admission_requirements_write on public.admission_requirements
  for all using (public.has_community_permission(community_id, 'edit_profile'))
  with check (public.has_community_permission(community_id, 'edit_profile'));

drop policy if exists availability_select on public.availability;
create policy availability_select on public.availability
  for select using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.status = 'verified' or public.is_community_staff(c.id))
    )
  );
drop policy if exists availability_write on public.availability;
create policy availability_write on public.availability
  for all using (public.has_community_permission(community_id, 'edit_availability'))
  with check (public.has_community_permission(community_id, 'edit_availability'));

drop policy if exists community_team_select on public.community_team_members;
create policy community_team_select on public.community_team_members
  for select using (
    public.is_org_member(organization_id) or user_id = auth.uid() or public.is_platform_admin()
  );
drop policy if exists community_team_write on public.community_team_members;
create policy community_team_write on public.community_team_members
  for all using (
    public.is_org_admin(organization_id)
    or public.has_community_permission(community_id, 'manage_team')
    or public.is_platform_admin()
  )
  with check (
    public.is_org_admin(organization_id) or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- Shortlist
-- ---------------------------------------------------------------------------
drop policy if exists favorites_all on public.favorites;
create policy favorites_all on public.favorites
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists comparisons_all on public.comparisons;
create policy comparisons_all on public.comparisons
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists comparison_items_all on public.comparison_items;
create policy comparison_items_all on public.comparison_items
  for all using (
    exists (
      select 1 from public.comparisons c
      where c.id = comparison_id and public.is_family_member(c.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.comparisons c
      where c.id = comparison_id and public.is_family_member(c.family_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    public.is_family_member(family_id)
    or public.is_community_staff(community_id)
    or public.is_platform_admin()
  );
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert with check (public.is_family_editor(family_id));
drop policy if exists applications_update_family on public.applications;
create policy applications_update_family on public.applications
  for update using (
    public.is_family_editor(family_id)
    or public.has_community_permission(community_id, 'change_status')
    or public.is_platform_admin()
  );

drop policy if exists application_documents_all on public.application_documents;
create policy application_documents_all on public.application_documents
  for all using (public.can_read_application(application_id))
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.is_family_editor(a.family_id)
    )
  );

drop policy if exists application_questions_all on public.application_questions;
create policy application_questions_all on public.application_questions
  for all using (public.can_read_application(application_id))
  with check (public.can_read_application(application_id));

drop policy if exists application_timeline_select on public.application_timeline;
create policy application_timeline_select on public.application_timeline
  for select using (public.can_read_application(application_id));
-- inserts via triggers / service role / edge (no direct client insert policy)

drop policy if exists application_status_history_select on public.application_status_history;
create policy application_status_history_select on public.application_status_history
  for select using (public.can_read_application(application_id));

-- ---------------------------------------------------------------------------
-- Messaging / tours / tasks / notifications
-- ---------------------------------------------------------------------------
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select using (
    public.is_family_member(family_id) or public.is_community_staff(community_id)
  );
drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert with check (
    public.is_family_member(family_id) or public.is_community_staff(community_id)
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (public.is_family_member(c.family_id) or public.is_community_staff(c.community_id))
    )
  );
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (public.is_family_member(c.family_id) or public.is_community_staff(c.community_id))
    )
  );

drop policy if exists message_reads_all on public.message_reads;
create policy message_reads_all on public.message_reads
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tours_select on public.tours;
create policy tours_select on public.tours
  for select using (public.can_read_application(application_id));
drop policy if exists tours_write on public.tours;
create policy tours_write on public.tours
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          public.is_family_editor(a.family_id)
          or public.has_community_permission(a.community_id, 'propose_tour')
        )
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          public.is_family_editor(a.family_id)
          or public.has_community_permission(a.community_id, 'propose_tour')
        )
    )
  );

drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists notifications_all on public.notifications;
create policy notifications_all on public.notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI / audit / integrations
-- ---------------------------------------------------------------------------
drop policy if exists audit_logs_admin on public.audit_logs;
create policy audit_logs_admin on public.audit_logs
  for select using (public.is_platform_admin());

drop policy if exists compatibility_select on public.compatibility_analyses;
create policy compatibility_select on public.compatibility_analyses
  for select using (
    exists (
      select 1 from public.seniors s
      where s.id = senior_id and public.is_family_member(s.family_id)
    )
    or public.is_community_staff(community_id)
  );

drop policy if exists ai_summaries_select on public.ai_summaries;
create policy ai_summaries_select on public.ai_summaries
  for select using (
    exists (
      select 1 from public.seniors s
      where s.id = senior_id and public.is_family_member(s.family_id)
    )
  );

drop policy if exists community_embeddings_staff on public.community_embeddings;
create policy community_embeddings_staff on public.community_embeddings
  for select using (public.is_community_staff(community_id) or public.is_platform_admin());

drop policy if exists senior_embeddings_family on public.senior_embeddings;
create policy senior_embeddings_family on public.senior_embeddings
  for select using (
    exists (
      select 1 from public.seniors s
      where s.id = senior_id and public.is_family_member(s.family_id)
    )
  );

drop policy if exists integration_providers_read on public.integration_providers;
create policy integration_providers_read on public.integration_providers
  for select using (auth.uid() is not null);

drop policy if exists organization_integrations_org on public.organization_integrations;
create policy organization_integrations_org on public.organization_integrations
  for all using (public.is_org_admin(organization_id) or public.is_platform_admin())
  with check (public.is_org_admin(organization_id) or public.is_platform_admin());

drop policy if exists webhook_events_org on public.webhook_events;
create policy webhook_events_org on public.webhook_events
  for select using (
    organization_id is not null and public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

drop policy if exists integration_logs_org on public.integration_logs;
create policy integration_logs_org on public.integration_logs
  for select using (
    exists (
      select 1 from public.organization_integrations oi
      where oi.id = organization_integration_id
        and public.is_org_admin(oi.organization_id)
    )
    or public.is_platform_admin()
  );

-- outbox: service role only (no policies for authenticated = deny by default)
drop policy if exists outbox_admin_select on public.outbox_events;
create policy outbox_admin_select on public.outbox_events
  for select using (public.is_platform_admin());

drop policy if exists partners_admin on public.partners;
create policy partners_admin on public.partners
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists partner_services_admin on public.partner_services;
create policy partner_services_admin on public.partner_services
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists referrals_admin on public.referrals;
create policy referrals_admin on public.referrals
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists quotes_admin on public.quotes;
create policy quotes_admin on public.quotes
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Append-only timeline for authenticated roles
revoke update, delete on public.application_timeline from authenticated;
revoke update, delete on public.audit_logs from authenticated;
revoke update, delete on public.outbox_events from authenticated;
