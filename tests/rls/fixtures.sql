-- ---------------------------------------------------------------------------
-- RLS test fixtures — entirely fictitious data.
--
-- Two unrelated tenants (family A / residence A, family B / residence B) plus
-- one unlisted residence, so every policy can be exercised against rows that
-- the caller must see and rows the caller must never see.
--
-- Loaded by tests/rls/harness.ts as the superuser (RLS bypassed on purpose:
-- this is the "service role" side of the fence). Every assertion afterwards
-- runs as `anon` or `authenticated`.
--
-- Names, addresses and emails below are invented. No real resident file, no
-- production identifier, ever belongs in this file.
-- ---------------------------------------------------------------------------

-- People -------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'famille.a.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'famille.a.lecteur@example.test'),
  ('00000000-0000-4000-8000-0000000000b1', 'famille.b.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000c1', 'residence.a.lecture@example.test'),
  ('00000000-0000-4000-8000-0000000000c2', 'residence.a.gestion@example.test'),
  ('00000000-0000-4000-8000-0000000000c3', 'residence.a.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000d1', 'residence.b.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000e1', 'plateforme.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000f1', 'organisation.a.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000f2', 'equipe.legacy.a@example.test');

-- `handle_new_user` (0002) already inserted a profile row for each auth user;
-- this fills in the fictitious names the assertions read back.
insert into public.profiles (id, first_name, last_name, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'Alix', 'Famille A', 'famille.a.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'Basile', 'Famille A', 'famille.a.lecteur@example.test'),
  ('00000000-0000-4000-8000-0000000000b1', 'Camille', 'Famille B', 'famille.b.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000c1', 'Dominique', 'Residence A', 'residence.a.lecture@example.test'),
  ('00000000-0000-4000-8000-0000000000c2', 'Elie', 'Residence A', 'residence.a.gestion@example.test'),
  ('00000000-0000-4000-8000-0000000000c3', 'Frederique', 'Residence A', 'residence.a.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000d1', 'Gaby', 'Residence B', 'residence.b.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000e1', 'Hugo', 'Plateforme', 'plateforme.admin@example.test'),
  ('00000000-0000-4000-8000-0000000000f1', 'Iris', 'Organisation A', 'organisation.a.proprietaire@example.test'),
  ('00000000-0000-4000-8000-0000000000f2', 'Jules', 'Equipe A', 'equipe.legacy.a@example.test')
on conflict (id) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email;

insert into public.platform_roles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'super_admin');

-- Families -----------------------------------------------------------------
insert into public.families (id, owner_id, family_name, primary_email) values
  ('33333333-3333-4333-8333-333333330001', '00000000-0000-4000-8000-0000000000a1', 'Famille A', 'famille.a.proprietaire@example.test'),
  ('33333333-3333-4333-8333-333333330002', '00000000-0000-4000-8000-0000000000b1', 'Famille B', 'famille.b.proprietaire@example.test');

insert into public.family_members (id, family_id, user_id, role, invitation_status) values
  ('33333333-3333-4333-8333-33333333a001', '33333333-3333-4333-8333-333333330001', '00000000-0000-4000-8000-0000000000a1', 'owner', 'accepted'),
  ('33333333-3333-4333-8333-33333333a002', '33333333-3333-4333-8333-333333330001', '00000000-0000-4000-8000-0000000000a2', 'viewer', 'accepted'),
  ('33333333-3333-4333-8333-33333333b001', '33333333-3333-4333-8333-333333330002', '00000000-0000-4000-8000-0000000000b1', 'owner', 'accepted');

insert into public.family_invitations (id, family_id, email, token, expires_at, invited_by) values
  ('33333333-3333-4333-8333-33333333c001', '33333333-3333-4333-8333-333333330001', 'invite.a@example.test', 'fixture-token-a', timezone('utc', now()) + interval '7 days', '00000000-0000-4000-8000-0000000000a1'),
  ('33333333-3333-4333-8333-33333333c002', '33333333-3333-4333-8333-333333330002', 'invite.b@example.test', 'fixture-token-b', timezone('utc', now()) + interval '7 days', '00000000-0000-4000-8000-0000000000b1');

-- Seniors and vault --------------------------------------------------------
insert into public.seniors (id, family_id, first_name, last_name, created_by) values
  ('44444444-4444-4444-8444-444444440001', '33333333-3333-4333-8333-333333330001', 'Renee', 'A', '00000000-0000-4000-8000-0000000000a1'),
  ('44444444-4444-4444-8444-444444440002', '33333333-3333-4333-8333-333333330001', 'Simone', 'A', '00000000-0000-4000-8000-0000000000a1'),
  ('44444444-4444-4444-8444-444444440003', '33333333-3333-4333-8333-333333330002', 'Therese', 'B', '00000000-0000-4000-8000-0000000000b1');

insert into public.emergency_contacts (id, senior_id, family_id, full_name, phone) values
  ('44444444-4444-4444-8444-4444444e0001', '44444444-4444-4444-8444-444444440001', '33333333-3333-4333-8333-333333330001', 'Contact A', '555-0100'),
  ('44444444-4444-4444-8444-4444444e0002', '44444444-4444-4444-8444-444444440003', '33333333-3333-4333-8333-333333330002', 'Contact B', '555-0200');

insert into public.senior_care_assessments (id, senior_id) values
  ('44444444-4444-4444-8444-4444444a0001', '44444444-4444-4444-8444-444444440001'),
  ('44444444-4444-4444-8444-4444444a0002', '44444444-4444-4444-8444-444444440003');

insert into public.senior_medical_conditions (id, senior_id, condition) values
  ('44444444-4444-4444-8444-4444444b0001', '44444444-4444-4444-8444-444444440001', 'Condition fictive A'),
  ('44444444-4444-4444-8444-4444444b0002', '44444444-4444-4444-8444-444444440003', 'Condition fictive B');

insert into public.medications (id, senior_id, name) values
  ('44444444-4444-4444-8444-4444444c0001', '44444444-4444-4444-8444-444444440001', 'Medicament fictif A'),
  ('44444444-4444-4444-8444-4444444c0002', '44444444-4444-4444-8444-444444440003', 'Medicament fictif B');

insert into public.allergies (id, senior_id, allergy) values
  ('44444444-4444-4444-8444-4444444d0001', '44444444-4444-4444-8444-444444440001', 'Allergie fictive A'),
  ('44444444-4444-4444-8444-4444444d0002', '44444444-4444-4444-8444-444444440003', 'Allergie fictive B');

insert into public.senior_embeddings (senior_id) values
  ('44444444-4444-4444-8444-444444440001'),
  ('44444444-4444-4444-8444-444444440003');

insert into public.ai_summaries (id, senior_id, medical_summary) values
  ('44444444-4444-4444-8444-4444444f0001', '44444444-4444-4444-8444-444444440001', 'Resume fictif A'),
  ('44444444-4444-4444-8444-4444444f0002', '44444444-4444-4444-8444-444444440003', 'Resume fictif B');

-- Organizations and residences ---------------------------------------------
insert into public.organizations (id, name, slug, owner_user_id) values
  ('11111111-1111-4111-8111-111111110001', 'Groupe A', 'groupe-a', '00000000-0000-4000-8000-0000000000f1'),
  ('11111111-1111-4111-8111-111111110002', 'Groupe B', 'groupe-b', null);

insert into public.organization_settings (organization_id) values
  ('11111111-1111-4111-8111-111111110001'),
  ('11111111-1111-4111-8111-111111110002');

insert into public.organization_roles (id, organization_id, user_id, role) values
  ('11111111-1111-4111-8111-1111111a0001', '11111111-1111-4111-8111-111111110001', '00000000-0000-4000-8000-0000000000f1', 'org_owner');

insert into public.communities (id, organization_id, name, slug, status) values
  ('22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001', 'Residence A', 'residence-a', 'verified'),
  ('22222222-2222-4222-8222-222222220002', '11111111-1111-4111-8111-111111110002', 'Residence B', 'residence-b', 'verified'),
  ('22222222-2222-4222-8222-222222220003', '11111111-1111-4111-8111-111111110001', 'Residence C non publiee', 'residence-c', 'draft');

-- Site detail rows exist for both a published and an unpublished residence so
-- the anonymous sweep proves the `status = 'verified'` predicate really filters.
insert into public.community_services (id, community_id, service) values
  ('22222222-2222-4222-8222-2222222a0001', '22222222-2222-4222-8222-222222220001', 'Service publie'),
  ('22222222-2222-4222-8222-2222222a0002', '22222222-2222-4222-8222-222222220003', 'Service non publie');

insert into public.community_amenities (id, community_id, amenity) values
  ('22222222-2222-4222-8222-2222222b0001', '22222222-2222-4222-8222-222222220001', 'Commodite publiee'),
  ('22222222-2222-4222-8222-2222222b0002', '22222222-2222-4222-8222-222222220003', 'Commodite non publiee');

insert into public.community_rooms (id, community_id, room_type) values
  ('22222222-2222-4222-8222-2222222c0001', '22222222-2222-4222-8222-222222220001', 'Studio'),
  ('22222222-2222-4222-8222-2222222c0002', '22222222-2222-4222-8222-222222220003', 'Studio');

insert into public.admission_requirements (id, community_id) values
  ('22222222-2222-4222-8222-2222222d0001', '22222222-2222-4222-8222-222222220001'),
  ('22222222-2222-4222-8222-2222222d0002', '22222222-2222-4222-8222-222222220003');

insert into public.availability (id, community_id, care_level) values
  ('22222222-2222-4222-8222-2222222e0001', '22222222-2222-4222-8222-222222220001', 'assisted_living'),
  ('22222222-2222-4222-8222-2222222e0002', '22222222-2222-4222-8222-222222220003', 'assisted_living');

insert into public.community_embeddings (community_id) values
  ('22222222-2222-4222-8222-222222220001'),
  ('22222222-2222-4222-8222-222222220002');

insert into public.site_admissions_settings (community_id, is_active, paused_reason) values
  ('22222222-2222-4222-8222-222222220001', true, null),
  ('22222222-2222-4222-8222-222222220003', false, 'Motif interne fictif');

-- Legacy team model (0003/0006) kept alongside staff_memberships (0011).
insert into public.community_team_members (id, organization_id, community_id, user_id, role, status) values
  ('22222222-2222-4222-8222-2222222f0001', '11111111-1111-4111-8111-111111110001', '22222222-2222-4222-8222-222222220001', '00000000-0000-4000-8000-0000000000f2', 'admissions_manager', 'active');

-- Staff memberships: the source of truth for the admissions milestone --------
insert into public.staff_memberships (id, user_id, community_id, role) values
  ('88888888-8888-4888-8888-888888880001', '00000000-0000-4000-8000-0000000000c1', '22222222-2222-4222-8222-222222220001', 'readonly'),
  ('88888888-8888-4888-8888-888888880002', '00000000-0000-4000-8000-0000000000c2', '22222222-2222-4222-8222-222222220001', 'manager'),
  ('88888888-8888-4888-8888-888888880003', '00000000-0000-4000-8000-0000000000c3', '22222222-2222-4222-8222-222222220001', 'admin'),
  ('88888888-8888-4888-8888-888888880004', '00000000-0000-4000-8000-0000000000d1', '22222222-2222-4222-8222-222222220002', 'admin');

insert into public.staff_invitations (id, email_hash, community_id, role, token_hash, expires_at, invited_by) values
  ('88888888-8888-4888-8888-8888888a0001', 'hachage-fictif-a', '22222222-2222-4222-8222-222222220001', 'coordinator', 'jeton-hache-a', timezone('utc', now()) + interval '2 days', '00000000-0000-4000-8000-0000000000c3'),
  ('88888888-8888-4888-8888-8888888a0002', 'hachage-fictif-b', '22222222-2222-4222-8222-222222220002', 'coordinator', 'jeton-hache-b', timezone('utc', now()) + interval '2 days', '00000000-0000-4000-8000-0000000000d1');

insert into public.auth_sessions (id, user_id, expires_at) values
  ('88888888-8888-4888-8888-8888888b0001', '00000000-0000-4000-8000-0000000000a1', timezone('utc', now()) + interval '1 day'),
  ('88888888-8888-4888-8888-8888888b0002', '00000000-0000-4000-8000-0000000000b1', timezone('utc', now()) + interval '1 day');

insert into public.security_audit_log (id, event, actor_id, outcome) values
  ('88888888-8888-4888-8888-8888888c0001', 'auth.signin', '00000000-0000-4000-8000-0000000000a1', 'success'),
  ('88888888-8888-4888-8888-8888888c0002', 'auth.signin', '00000000-0000-4000-8000-0000000000b1', 'failure');

insert into public.auth_rate_limits (key, window_started_at, count) values
  ('fixture:signin', timezone('utc', now()), 1);

-- Applications -------------------------------------------------------------
insert into public.applications
  (id, family_id, senior_id, community_id, organization_id, submitted_by, status, submitted_at, client_request_id, admissions_payload)
values
  ('55555555-5555-4555-8555-555555550001', '33333333-3333-4333-8333-333333330001', '44444444-4444-4444-8444-444444440001', '22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001', '00000000-0000-4000-8000-0000000000a1', 'submitted', timezone('utc', now()), 'req-a-1', '{"siteName":"Residence A"}'::jsonb),
  ('55555555-5555-4555-8555-555555550002', '33333333-3333-4333-8333-333333330002', '44444444-4444-4444-8444-444444440003', '22222222-2222-4222-8222-222222220002', '11111111-1111-4111-8111-111111110002', '00000000-0000-4000-8000-0000000000b1', 'submitted', timezone('utc', now()), 'req-b-1', '{"siteName":"Residence B"}'::jsonb),
  ('55555555-5555-4555-8555-555555550003', '33333333-3333-4333-8333-333333330001', '44444444-4444-4444-8444-444444440002', '22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001', '00000000-0000-4000-8000-0000000000a1', 'draft', null, 'req-a-2', '{"siteName":"Residence A"}'::jsonb);

insert into public.application_status_history (id, application_id, from_status, to_status, changed_by) values
  ('55555555-5555-4555-8555-5555555a0001', '55555555-5555-4555-8555-555555550001', 'draft', 'submitted', '00000000-0000-4000-8000-0000000000a1'),
  ('55555555-5555-4555-8555-5555555a0002', '55555555-5555-4555-8555-555555550002', 'draft', 'submitted', '00000000-0000-4000-8000-0000000000b1');

insert into public.application_timeline (id, application_id, event_type, description, created_by) values
  ('55555555-5555-4555-8555-5555555b0001', '55555555-5555-4555-8555-555555550001', 'submitted', 'Dossier transmis', '00000000-0000-4000-8000-0000000000a1'),
  ('55555555-5555-4555-8555-5555555b0002', '55555555-5555-4555-8555-555555550002', 'submitted', 'Dossier transmis', '00000000-0000-4000-8000-0000000000b1');

insert into public.application_questions (id, application_id, question) values
  ('55555555-5555-4555-8555-5555555c0001', '55555555-5555-4555-8555-555555550001', 'Question fictive A'),
  ('55555555-5555-4555-8555-5555555c0002', '55555555-5555-4555-8555-555555550002', 'Question fictive B');

insert into public.admissions_audit_log (id, application_id, actor_type, actor_id, action) values
  ('55555555-5555-4555-8555-5555555d0001', '55555555-5555-4555-8555-555555550001', 'family', '00000000-0000-4000-8000-0000000000a1', 'application.submitted'),
  ('55555555-5555-4555-8555-5555555d0002', '55555555-5555-4555-8555-555555550002', 'family', '00000000-0000-4000-8000-0000000000b1', 'application.submitted');

insert into public.tours (id, application_id, created_by) values
  ('55555555-5555-4555-8555-5555555e0001', '55555555-5555-4555-8555-555555550001', '00000000-0000-4000-8000-0000000000c2'),
  ('55555555-5555-4555-8555-5555555e0002', '55555555-5555-4555-8555-555555550002', '00000000-0000-4000-8000-0000000000d1');

insert into public.compatibility_analyses (id, senior_id, community_id, score, version) values
  ('55555555-5555-4555-8555-5555555f0001', '44444444-4444-4444-8444-444444440001', '22222222-2222-4222-8222-222222220001', 72.5, 'v1'),
  ('55555555-5555-4555-8555-5555555f0002', '44444444-4444-4444-8444-444444440003', '22222222-2222-4222-8222-222222220002', 64.0, 'v1');

-- Documents ----------------------------------------------------------------
insert into public.documents (id, senior_id, family_id, title, bucket, storage_path, uploaded_by) values
  ('66666666-6666-4666-8666-666666660001', '44444444-4444-4444-8444-444444440001', '33333333-3333-4333-8333-333333330001', 'Document fictif A', 'documents', 'famille-a/fictif-a.pdf', '00000000-0000-4000-8000-0000000000a1'),
  ('66666666-6666-4666-8666-666666660002', '44444444-4444-4444-8444-444444440003', '33333333-3333-4333-8333-333333330002', 'Document fictif B', 'documents', 'famille-b/fictif-b.pdf', '00000000-0000-4000-8000-0000000000b1'),
  ('66666666-6666-4666-8666-666666660003', '44444444-4444-4444-8444-444444440001', '33333333-3333-4333-8333-333333330001', 'Document non partage A', 'documents', 'famille-a/prive-a.pdf', '00000000-0000-4000-8000-0000000000a1');

insert into public.document_access (id, document_id, application_id, community_id, shared_by) values
  ('66666666-6666-4666-8666-6666666a0001', '66666666-6666-4666-8666-666666660001', '55555555-5555-4555-8555-555555550001', '22222222-2222-4222-8222-222222220001', '00000000-0000-4000-8000-0000000000a1'),
  ('66666666-6666-4666-8666-6666666a0002', '66666666-6666-4666-8666-666666660002', '55555555-5555-4555-8555-555555550002', '22222222-2222-4222-8222-222222220002', '00000000-0000-4000-8000-0000000000b1');

insert into public.document_access_logs (id, document_id, action, accessed_by) values
  ('66666666-6666-4666-8666-6666666b0001', '66666666-6666-4666-8666-666666660001', 'view', '00000000-0000-4000-8000-0000000000c2'),
  ('66666666-6666-4666-8666-6666666b0002', '66666666-6666-4666-8666-666666660002', 'view', '00000000-0000-4000-8000-0000000000d1');

insert into public.application_documents (id, application_id, document_id) values
  ('66666666-6666-4666-8666-6666666c0001', '55555555-5555-4555-8555-555555550001', '66666666-6666-4666-8666-666666660001'),
  ('66666666-6666-4666-8666-6666666c0002', '55555555-5555-4555-8555-555555550002', '66666666-6666-4666-8666-666666660002');

-- Shortlist, messaging, tasks, notifications --------------------------------
insert into public.favorites (id, family_id, community_id) values
  ('77777777-7777-4777-8777-777777770001', '33333333-3333-4333-8333-333333330001', '22222222-2222-4222-8222-222222220001'),
  ('77777777-7777-4777-8777-777777770002', '33333333-3333-4333-8333-333333330002', '22222222-2222-4222-8222-222222220002');

insert into public.comparisons (id, family_id) values
  ('77777777-7777-4777-8777-7777777a0001', '33333333-3333-4333-8333-333333330001'),
  ('77777777-7777-4777-8777-7777777a0002', '33333333-3333-4333-8333-333333330002');

insert into public.comparison_items (id, comparison_id, community_id) values
  ('77777777-7777-4777-8777-7777777b0001', '77777777-7777-4777-8777-7777777a0001', '22222222-2222-4222-8222-222222220001'),
  ('77777777-7777-4777-8777-7777777b0002', '77777777-7777-4777-8777-7777777a0002', '22222222-2222-4222-8222-222222220002');

insert into public.conversations (id, application_id, family_id, community_id, organization_id) values
  ('77777777-7777-4777-8777-7777777c0001', '55555555-5555-4555-8555-555555550001', '33333333-3333-4333-8333-333333330001', '22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001'),
  ('77777777-7777-4777-8777-7777777c0002', '55555555-5555-4555-8555-555555550002', '33333333-3333-4333-8333-333333330002', '22222222-2222-4222-8222-222222220002', '11111111-1111-4111-8111-111111110002');

insert into public.messages (id, conversation_id, sender_id, body) values
  ('77777777-7777-4777-8777-7777777d0001', '77777777-7777-4777-8777-7777777c0001', '00000000-0000-4000-8000-0000000000a1', 'Message fictif A'),
  ('77777777-7777-4777-8777-7777777d0002', '77777777-7777-4777-8777-7777777c0002', '00000000-0000-4000-8000-0000000000b1', 'Message fictif B');

insert into public.message_reads (id, message_id, user_id) values
  ('77777777-7777-4777-8777-7777777e0001', '77777777-7777-4777-8777-7777777d0001', '00000000-0000-4000-8000-0000000000a1'),
  ('77777777-7777-4777-8777-7777777e0002', '77777777-7777-4777-8777-7777777d0002', '00000000-0000-4000-8000-0000000000b1');

insert into public.tasks (id, family_id, title, created_by) values
  ('77777777-7777-4777-8777-7777777f0001', '33333333-3333-4333-8333-333333330001', 'Tache fictive A', '00000000-0000-4000-8000-0000000000a1'),
  ('77777777-7777-4777-8777-7777777f0002', '33333333-3333-4333-8333-333333330002', 'Tache fictive B', '00000000-0000-4000-8000-0000000000b1');

insert into public.notifications (id, user_id, type, title) values
  ('99999999-9999-4999-8999-999999990001', '00000000-0000-4000-8000-0000000000a1', 'application', 'Notification fictive A'),
  ('99999999-9999-4999-8999-999999990002', '00000000-0000-4000-8000-0000000000b1', 'application', 'Notification fictive B');

-- Loi 25 surfaces ----------------------------------------------------------
insert into public.consent_records (id, user_id, family_id, purpose, granted, version, purpose_text) values
  ('99999999-9999-4999-8999-9999999a0001', '00000000-0000-4000-8000-0000000000a1', '33333333-3333-4333-8333-333333330001', 'profile_retention', true, 'v1', 'Conservation du profil'),
  ('99999999-9999-4999-8999-9999999a0002', '00000000-0000-4000-8000-0000000000b1', '33333333-3333-4333-8333-333333330002', 'profile_retention', true, 'v1', 'Conservation du profil');

insert into public.rights_operation_logs (id, user_id, operation) values
  ('99999999-9999-4999-8999-9999999b0001', '00000000-0000-4000-8000-0000000000a1', 'export'),
  ('99999999-9999-4999-8999-9999999b0002', '00000000-0000-4000-8000-0000000000b1', 'export');

insert into public.account_deletion_requests (id, user_id) values
  ('99999999-9999-4999-8999-9999999c0001', '00000000-0000-4000-8000-0000000000a1'),
  ('99999999-9999-4999-8999-9999999c0002', '00000000-0000-4000-8000-0000000000b1');

-- Platform-internal surfaces -----------------------------------------------
insert into public.audit_logs (id, action, resource_type, actor_id) values
  ('99999999-9999-4999-8999-9999999d0001', 'application.viewed', 'application', '00000000-0000-4000-8000-0000000000c2');

insert into public.integration_providers (id, key, name) values
  ('99999999-9999-4999-8999-9999999e0001', 'fixture-crm', 'CRM fictif');

insert into public.organization_integrations (id, organization_id, provider_id) values
  ('99999999-9999-4999-8999-9999999f0001', '11111111-1111-4111-8111-111111110001', '99999999-9999-4999-8999-9999999e0001'),
  ('99999999-9999-4999-8999-9999999f0002', '11111111-1111-4111-8111-111111110002', '99999999-9999-4999-8999-9999999e0001');

insert into public.webhook_events (id, organization_id, direction) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', '11111111-1111-4111-8111-111111110001', 'inbound'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', '11111111-1111-4111-8111-111111110002', 'inbound');

insert into public.integration_logs (id, organization_integration_id, message) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa1001', '99999999-9999-4999-8999-9999999f0001', 'Trace fictive A'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa1002', '99999999-9999-4999-8999-9999999f0002', 'Trace fictive B');

insert into public.outbox_events (id, aggregate_type, aggregate_id, event_type, idempotency_key) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa2001', 'application', '55555555-5555-4555-8555-555555550001', 'application.submitted', 'fixture-outbox-1');

insert into public.partners (id, name, category) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa3001', 'Partenaire fictif', 'demenagement');

insert into public.partner_services (id, partner_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa4001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa3001', 'Service fictif');

insert into public.referrals (id, partner_id, family_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa5001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa3001', '33333333-3333-4333-8333-333333330001');

insert into public.quotes (id, referral_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa6001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa5001');
