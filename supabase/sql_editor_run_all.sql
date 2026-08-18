-- HavenApply — paste into Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run (drops triggers/policies before recreate).


-- =============================================================================
-- FILE: 0001_extensions.sql
-- =============================================================================

-- HavenApply 0001: extensions & shared utilities
-- Target: Supabase Postgres

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
-- PostGIS & vector may need to be enabled in Supabase dashboard if not available in local
create extension if not exists "postgis";
create extension if not exists "vector";

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Enums (shared across domains)
do $$ begin
  create type public.profile_status as enum ('active', 'invited', 'suspended', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_role as enum ('super_admin', 'ops', 'support', 'moderator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.family_member_role as enum ('owner', 'editor', 'viewer', 'medical', 'financial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_status as enum ('draft', 'active', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.community_status as enum ('draft', 'pending_review', 'verified', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.community_team_role as enum ('org_admin', 'admissions_manager', 'admissions_staff', 'readonly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_role_kind as enum ('org_owner', 'billing_admin', 'crm_admin', 'analytics_viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum ('uploading', 'ready', 'quarantined', 'expired', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_category as enum ('id', 'insurance', 'medical', 'financial', 'legal', 'application', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum (
    'draft',
    'submitted',
    'received',
    'under_review',
    'more_info',
    'tour_requested',
    'assessment_requested',
    'waitlisted',
    'conditionally_approved',
    'approved',
    'offer_received',
    'declined',
    'withdrawn',
    'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tour_status as enum ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outbox_status as enum ('pending', 'processing', 'sent', 'failed', 'dead');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_status as enum ('received', 'processed', 'failed', 'ignored');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integration_status as enum ('disconnected', 'connecting', 'active', 'error', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_level as enum (
    'mostly_independent',
    'light_assisted',
    'assisted_living',
    'memory_care',
    'skilled_nursing'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_visibility as enum ('internal', 'support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.team_member_status as enum ('invited', 'active', 'suspended', 'removed');
exception when duplicate_object then null; end $$;


-- =============================================================================
-- FILE: 0002_identity_families_seniors.sql
-- =============================================================================

-- HavenApply 0002: identity, families, seniors, documents

-- ---------------------------------------------------------------------------
-- Profiles (1:1 auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  status public.profile_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Platform roles
-- ---------------------------------------------------------------------------
create table if not exists public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

create index if not exists platform_roles_user_idx on public.platform_roles (user_id);

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  family_name text,
  primary_email text,
  primary_phone text,
  state text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists families_owner_idx on public.families (owner_id);

drop trigger if exists families_set_updated_at on public.families;
create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_member_role not null default 'viewer',
  invitation_status public.invitation_status not null default 'accepted',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, user_id)
);

create index if not exists family_members_user_idx on public.family_members (user_id);
create index if not exists family_members_family_idx on public.family_members (family_id);

drop trigger if exists family_members_set_updated_at on public.family_members;
create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null,
  role public.family_member_role not null default 'viewer',
  token text not null unique,
  invited_by uuid references public.profiles (id),
  invitation_status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists family_invitations_family_idx on public.family_invitations (family_id);
create index if not exists family_invitations_email_idx on public.family_invitations (lower(email));

-- ---------------------------------------------------------------------------
-- Seniors
-- ---------------------------------------------------------------------------
create table if not exists public.seniors (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete restrict,
  created_by uuid references public.profiles (id),
  first_name text not null default '',
  middle_name text,
  last_name text not null default '',
  birth_date date,
  gender text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  language text default 'en',
  relationship_to_creator text,
  living_situation text,
  move_timeline text,
  search_radius_miles integer,
  preferred_locations jsonb not null default '[]'::jsonb,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  funding_type text,
  completed_percentage integer not null default 0
    check (completed_percentage >= 0 and completed_percentage <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint seniors_budget_check check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  )
);

create index if not exists seniors_family_idx on public.seniors (family_id) where deleted_at is null;
create index if not exists seniors_family_created_idx on public.seniors (family_id, created_at desc);

drop trigger if exists seniors_set_updated_at on public.seniors;
create trigger seniors_set_updated_at
  before update on public.seniors
  for each row execute function public.set_updated_at();

create table if not exists public.senior_care_assessments (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null unique references public.seniors (id) on delete cascade,
  mobility jsonb not null default '{}'::jsonb,
  adl jsonb not null default '{}'::jsonb,
  medications jsonb not null default '{}'::jsonb,
  cognition jsonb not null default '{}'::jsonb,
  health_conditions jsonb not null default '{}'::jsonb,
  behavior jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  ai_summary text,
  support_level public.support_level,
  schema_version integer not null default 1,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists senior_care_assessments_set_updated_at on public.senior_care_assessments;
create trigger senior_care_assessments_set_updated_at
  before update on public.senior_care_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.senior_medical_conditions (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  condition text not null,
  severity text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists senior_medical_conditions_senior_idx
  on public.senior_medical_conditions (senior_id);
create index if not exists senior_medical_conditions_condition_idx
  on public.senior_medical_conditions (lower(condition));

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  requires_assistance boolean not null default false,
  controlled boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists medications_senior_idx on public.medications (senior_id);

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

create table if not exists public.allergies (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  allergy text not null,
  reaction text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists allergies_senior_idx on public.allergies (senior_id);

-- ---------------------------------------------------------------------------
-- Documents (no durable file_url)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  uploaded_by uuid references public.profiles (id),
  category public.document_category not null default 'other',
  title text not null,
  description text,
  bucket text not null,
  storage_path text not null,
  mime_type text,
  byte_size bigint,
  checksum_sha256 text,
  version integer not null default 1,
  status public.document_status not null default 'uploading',
  expires_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (bucket, storage_path)
);

create index if not exists documents_senior_idx on public.documents (senior_id) where deleted_at is null;
create index if not exists documents_family_idx on public.documents (family_id, created_at desc);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();


-- =============================================================================
-- FILE: 0003_orgs_communities.sql
-- =============================================================================

-- HavenApply 0003: organizations, communities, catalog, team, shortlist

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  website text,
  status public.organization_status not null default 'draft',
  owner_user_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  schema_version integer not null default 1,
  preferences jsonb not null default '{}'::jsonb,
  billing jsonb not null default '{}'::jsonb,
  crm jsonb not null default '{}'::jsonb,
  analytics jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists organization_settings_set_updated_at on public.organization_settings;
create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function public.set_updated_at();

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.organization_role_kind not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id, role)
);

create index if not exists organization_roles_org_idx on public.organization_roles (organization_id);
create index if not exists organization_roles_user_idx on public.organization_roles (user_id);

-- ---------------------------------------------------------------------------
-- Communities (sites)
-- ---------------------------------------------------------------------------
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  website text,
  latitude double precision,
  longitude double precision,
  location geography(point, 4326),
  starting_price numeric(12, 2),
  rating numeric(3, 2),
  verified boolean not null default false,
  status public.community_status not null default 'draft',
  search_tsv tsvector,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

create index if not exists communities_org_idx on public.communities (organization_id) where deleted_at is null;
create index if not exists communities_status_idx on public.communities (status) where deleted_at is null;
create index if not exists communities_state_idx on public.communities (state);
create index if not exists communities_location_gix on public.communities using gist (location);
create index if not exists communities_search_gin on public.communities using gin (search_tsv);
create index if not exists communities_name_trgm on public.communities using gin (name gin_trgm_ops);

create or replace function public.communities_search_tsv_update()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.state, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');

  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;

  return new;
end;
$$;

drop trigger if exists communities_search_tsv_trg on public.communities;
create trigger communities_search_tsv_trg
  before insert or update of name, city, state, description, latitude, longitude
  on public.communities
  for each row execute function public.communities_search_tsv_update();

drop trigger if exists communities_set_updated_at on public.communities;
create trigger communities_set_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();

create table if not exists public.community_services (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  service text not null,
  unique (community_id, service)
);

create index if not exists community_services_community_idx on public.community_services (community_id);
create index if not exists community_services_service_idx on public.community_services (lower(service));

create table if not exists public.community_amenities (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  amenity text not null,
  unique (community_id, amenity)
);

create index if not exists community_amenities_community_idx on public.community_amenities (community_id);

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  room_type text not null,
  capacity integer,
  price numeric(12, 2),
  available boolean not null default true,
  available_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_rooms_community_idx on public.community_rooms (community_id);

drop trigger if exists community_rooms_set_updated_at on public.community_rooms;
create trigger community_rooms_set_updated_at
  before update on public.community_rooms
  for each row execute function public.set_updated_at();

create table if not exists public.admission_requirements (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null unique references public.communities (id) on delete cascade,
  required_documents jsonb not null default '[]'::jsonb,
  accepted_conditions jsonb not null default '[]'::jsonb,
  excluded_conditions jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists admission_requirements_set_updated_at on public.admission_requirements;
create trigger admission_requirements_set_updated_at
  before update on public.admission_requirements
  for each row execute function public.set_updated_at();

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  care_level text not null,
  available_rooms integer not null default 0,
  waitlist integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (community_id, care_level)
);

create index if not exists availability_community_idx on public.availability (community_id);

drop trigger if exists availability_set_updated_at on public.availability;
create trigger availability_set_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

-- Team: community_id null => org-wide
create table if not exists public.community_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  community_id uuid references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.community_team_role not null default 'readonly',
  job_title text,
  status public.team_member_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint community_team_members_scope_check check (
    community_id is null or organization_id is not null
  )
);

-- Unique site membership
create unique index if not exists community_team_members_site_user_uidx
  on public.community_team_members (community_id, user_id)
  where community_id is not null;

-- Unique org-wide membership
create unique index if not exists community_team_members_org_wide_user_uidx
  on public.community_team_members (organization_id, user_id)
  where community_id is null;

create index if not exists community_team_members_user_idx on public.community_team_members (user_id);
create index if not exists community_team_members_org_idx on public.community_team_members (organization_id);

drop trigger if exists community_team_members_set_updated_at on public.community_team_members;
create trigger community_team_members_set_updated_at
  before update on public.community_team_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shortlist (not "search")
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  note text,
  label text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (family_id, community_id)
);

create index if not exists favorites_family_idx on public.favorites (family_id, created_at desc);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists comparisons_family_idx on public.comparisons (family_id, created_at desc);

create table if not exists public.comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  position integer not null default 0,
  unique (comparison_id, community_id)
);

create index if not exists comparison_items_comparison_idx on public.comparison_items (comparison_id);


-- =============================================================================
-- FILE: 0004_applications_messaging.sql
-- =============================================================================

-- HavenApply 0004: applications, messaging, tours, tasks, notifications

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete restrict,
  senior_id uuid not null references public.seniors (id) on delete restrict,
  community_id uuid not null references public.communities (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  submitted_by uuid references public.profiles (id),
  status public.application_status not null default 'draft',
  completion_percentage integer not null default 0
    check (completion_percentage >= 0 and completion_percentage <= 100),
  compatibility_score_cached numeric(5, 2),
  compatibility_analysis_id uuid,
  batch_id uuid,
  desired_move_in text,
  consent_share boolean not null default false,
  consent_accurate boolean not null default false,
  signature_name text,
  submitted_at timestamptz,
  last_activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  is_fixture boolean not null default false
);

create index if not exists applications_family_idx
  on public.applications (family_id, created_at desc) where deleted_at is null;
create index if not exists applications_community_status_idx
  on public.applications (community_id, status, last_activity_at desc) where deleted_at is null;
create index if not exists applications_org_idx
  on public.applications (organization_id, last_activity_at desc) where deleted_at is null;
create index if not exists applications_senior_idx on public.applications (senior_id);
create index if not exists applications_active_community_idx
  on public.applications (community_id, senior_id)
  where deleted_at is null
    and status not in ('declined', 'withdrawn', 'closed');

-- One active (non-terminal) application per senior+community
create unique index if not exists applications_active_unique
  on public.applications (senior_id, community_id)
  where deleted_at is null
    and status not in ('declined', 'withdrawn', 'closed');

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (application_id, document_id)
);

create index if not exists application_documents_app_idx on public.application_documents (application_id);

-- Share grants (staff visibility of vault docs)
create table if not exists public.document_access (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  shared_by uuid references public.profiles (id),
  shared_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  unique (document_id, application_id)
);

create index if not exists document_access_app_idx on public.document_access (application_id)
  where revoked_at is null;
create index if not exists document_access_community_idx on public.document_access (community_id)
  where revoked_at is null;

create table if not exists public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  accessed_by uuid references public.profiles (id),
  action text not null,
  ip inet,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_access_logs_doc_idx
  on public.document_access_logs (document_id, created_at desc);

create table if not exists public.application_questions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists application_questions_app_idx on public.application_questions (application_id);

drop trigger if exists application_questions_set_updated_at on public.application_questions;
create trigger application_questions_set_updated_at
  before update on public.application_questions
  for each row execute function public.set_updated_at();

create table if not exists public.application_timeline (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  event_type text not null,
  description text,
  created_by uuid references public.profiles (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists application_timeline_app_idx
  on public.application_timeline (application_id, created_at);

create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists application_status_history_app_idx
  on public.application_status_history (application_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subject text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists conversations_family_idx on public.conversations (family_id);
create index if not exists conversations_community_idx on public.conversations (community_id);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  unique (message_id, user_id)
);

create index if not exists message_reads_user_idx on public.message_reads (user_id);

-- ---------------------------------------------------------------------------
-- Tours / tasks / notifications
-- ---------------------------------------------------------------------------
create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  scheduled_at timestamptz,
  location text,
  status public.tour_status not null default 'proposed',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tours_application_idx on public.tours (application_id, scheduled_at);

drop trigger if exists tours_set_updated_at on public.tours;
create trigger tours_set_updated_at
  before update on public.tours
  for each row execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  assigned_to uuid references public.profiles (id),
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  due_date date,
  status public.task_status not null default 'open',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_family_idx on public.tasks (family_id, status, due_date);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;


-- =============================================================================
-- FILE: 0005_integrations_ai_audit.sql
-- =============================================================================

-- HavenApply 0005: integrations, AI, audit, marketplace stubs, embeddings

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip inet,
  metadata jsonb not null default '{}'::jsonb,
  visibility public.audit_visibility not null default 'internal',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI
-- ---------------------------------------------------------------------------
create table if not exists public.compatibility_analyses (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  score numeric(5, 2) not null,
  version text not null,
  weights jsonb not null default '{}'::jsonb,
  reasoning jsonb not null default '{}'::jsonb,
  model text,
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz
);

create index if not exists compatibility_analyses_senior_idx
  on public.compatibility_analyses (senior_id, generated_at desc);
create index if not exists compatibility_analyses_community_idx
  on public.compatibility_analyses (community_id, generated_at desc);
create index if not exists compatibility_analyses_version_idx
  on public.compatibility_analyses (version);

alter table public.applications
  drop constraint if exists applications_compatibility_analysis_id_fkey;

alter table public.applications
  add constraint applications_compatibility_analysis_id_fkey
  foreign key (compatibility_analysis_id)
  references public.compatibility_analyses (id)
  on delete set null;

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  medical_summary text,
  missing_information jsonb not null default '[]'::jsonb,
  version text not null default '1',
  generated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_summaries_senior_idx
  on public.ai_summaries (senior_id, generated_at desc);

-- Embeddings (pgvector) — separate from hot OLTP rows
create table if not exists public.community_embeddings (
  community_id uuid primary key references public.communities (id) on delete cascade,
  embedding vector(1536),
  model text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.senior_embeddings (
  senior_id uuid primary key references public.seniors (id) on delete cascade,
  embedding vector(1536),
  model text,
  updated_at timestamptz not null default timezone('utc', now())
);

-- Optional ANN indexes (create when data exists; may require tuning lists/m)
-- create index community_embeddings_hnsw on public.community_embeddings using hnsw (embedding vector_cosine_ops);
-- create index senior_embeddings_hnsw on public.senior_embeddings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Integrations
-- ---------------------------------------------------------------------------
create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null default 'crm',
  config_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.integration_providers (key, name, category) values
  ('pointclickcare', 'PointClickCare', 'ehr'),
  ('matrixcare', 'MatrixCare', 'ehr'),
  ('yardi', 'Yardi', 'pms'),
  ('salesforce', 'Salesforce', 'crm'),
  ('hubspot', 'HubSpot', 'crm')
on conflict (key) do nothing;

create table if not exists public.organization_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider_id uuid not null references public.integration_providers (id) on delete restrict,
  status public.integration_status not null default 'disconnected',
  credentials_ref text,
  config jsonb not null default '{}'::jsonb,
  sync_cursor text,
  last_sync_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider_id)
);

create index if not exists organization_integrations_org_idx
  on public.organization_integrations (organization_id);

drop trigger if exists organization_integrations_set_updated_at on public.organization_integrations;
create trigger organization_integrations_set_updated_at
  before update on public.organization_integrations
  for each row execute function public.set_updated_at();

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  provider_id uuid references public.integration_providers (id) on delete set null,
  direction public.webhook_direction not null,
  status public.webhook_status not null default 'received',
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  signature text,
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create unique index if not exists webhook_events_idempotency_uidx
  on public.webhook_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists webhook_events_org_idx
  on public.webhook_events (organization_id, created_at desc);

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  organization_integration_id uuid references public.organization_integrations (id) on delete cascade,
  level text not null default 'info',
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists integration_logs_integration_idx
  on public.integration_logs (organization_integration_id, created_at desc);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default timezone('utc', now()),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  unique (idempotency_key)
);

create index if not exists outbox_events_pending_idx
  on public.outbox_events (status, next_attempt_at)
  where status in ('pending', 'failed');

create index if not exists outbox_events_aggregate_idx
  on public.outbox_events (aggregate_type, aggregate_id);

-- ---------------------------------------------------------------------------
-- Marketplace stubs (future)
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.partner_services (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  family_id uuid references public.families (id) on delete set null,
  senior_id uuid references public.seniors (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  status text not null default 'created',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  amount numeric(12, 2),
  currency text not null default 'USD',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);


-- =============================================================================
-- FILE: 0006_rls_policies.sql
-- =============================================================================

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


-- =============================================================================
-- FILE: 0007_rpc_search_triggers.sql
-- =============================================================================

-- HavenApply 0007: domain triggers + search / dashboard RPCs

-- ---------------------------------------------------------------------------
-- Application status → timeline + status history + outbox
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_outbox(
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.outbox_events (
    aggregate_type, aggregate_id, event_type, payload, idempotency_key
  ) values (
    p_aggregate_type, p_aggregate_id, p_event_type, p_payload, p_idempotency_key
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

create or replace function public.on_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.application_status_history (
      application_id, from_status, to_status, changed_by, note
    ) values (
      new.id, old.status, new.status, auth.uid(), null
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

drop trigger if exists applications_status_change_trg on public.applications;
create trigger applications_status_change_trg
  before update of status on public.applications
  for each row execute function public.on_application_status_change();

-- Touch last_activity when messages arrive
create or replace function public.touch_application_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_id uuid;
begin
  select application_id into v_app_id
  from public.conversations
  where id = new.conversation_id;

  if v_app_id is not null then
    update public.applications
    set last_activity_at = timezone('utc', now())
    where id = v_app_id;

    update public.conversations
    set updated_at = timezone('utc', now())
    where id = new.conversation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_touch_application_trg on public.messages;
create trigger messages_touch_application_trg
  after insert on public.messages
  for each row execute function public.touch_application_on_message();

create or replace function public.touch_application_on_tour()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.applications
  set last_activity_at = timezone('utc', now())
  where id = new.application_id;
  return new;
end;
$$;

drop trigger if exists tours_touch_application_trg on public.tours;
create trigger tours_touch_application_trg
  after insert or update on public.tours
  for each row execute function public.touch_application_on_tour();

-- ---------------------------------------------------------------------------
-- RPC: search_communities
-- ---------------------------------------------------------------------------
create or replace function public.search_communities(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default 50000,
  p_query text default null,
  p_state text default null,
  p_service text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_limit integer default 20,
  p_cursor uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  slug text,
  city text,
  state text,
  starting_price numeric,
  rating numeric,
  verified boolean,
  distance_m double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_origin geography;
begin
  if p_lat is not null and p_lng is not null then
    v_origin := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  end if;

  return query
  select
    c.id,
    c.organization_id,
    c.name,
    c.slug,
    c.city,
    c.state,
    c.starting_price,
    c.rating,
    c.verified,
    case
      when v_origin is null or c.location is null then null
      else st_distance(c.location, v_origin)
    end as distance_m
  from public.communities c
  where c.deleted_at is null
    and c.status = 'verified'
    and (p_state is null or c.state = p_state)
    and (p_min_price is null or c.starting_price >= p_min_price)
    and (p_max_price is null or c.starting_price <= p_max_price)
    and (
      p_query is null
      or c.search_tsv @@ websearch_to_tsquery('english', p_query)
      or c.name ilike '%' || p_query || '%'
    )
    and (
      p_service is null
      or exists (
        select 1 from public.community_services cs
        where cs.community_id = c.id
          and lower(cs.service) = lower(p_service)
      )
    )
    and (
      v_origin is null
      or c.location is null
      or st_dwithin(c.location, v_origin, p_radius_m)
    )
    and (p_cursor is null or c.id > p_cursor)
  order by
    case when v_origin is not null then st_distance(c.location, v_origin) end nulls last,
    c.name
  limit greatest(1, least(p_limit, 100));
end;
$$;

grant execute on function public.search_communities to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RPC: get_application_packet (staff / family)
-- ---------------------------------------------------------------------------
create or replace function public.get_application_packet(p_application_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_result jsonb;
begin
  if not public.can_read_application(p_application_id) then
    raise exception 'not authorized';
  end if;

  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'application not found';
  end if;

  select jsonb_build_object(
    'application', to_jsonb(v_app),
    'senior', (
      select jsonb_build_object(
        'id', s.id,
        'first_name', s.first_name,
        'last_name', s.last_name,
        'birth_date', s.birth_date,
        'city', s.city,
        'state', s.state,
        'move_timeline', s.move_timeline,
        'budget_min', s.budget_min,
        'budget_max', s.budget_max
      )
      from public.seniors s where s.id = v_app.senior_id
    ),
    'care_assessment', (
      select to_jsonb(sca) - 'ai_summary'
      from public.senior_care_assessments sca
      where sca.senior_id = v_app.senior_id
    ),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'title', d.title,
        'category', d.category,
        'mime_type', d.mime_type,
        'status', d.status,
        'shared_at', da.shared_at
      ))
      from public.document_access da
      join public.documents d on d.id = da.document_id
      where da.application_id = v_app.id
        and da.revoked_at is null
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at)
      from public.application_timeline t
      where t.application_id = v_app.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_application_packet to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: family_dashboard_stats
-- ---------------------------------------------------------------------------
create or replace function public.family_dashboard_stats(p_family_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'seniors', (select count(*) from public.seniors where family_id = p_family_id and deleted_at is null),
    'applications_active', (
      select count(*) from public.applications
      where family_id = p_family_id
        and deleted_at is null
        and status not in ('declined', 'withdrawn', 'closed', 'draft')
    ),
    'favorites', (select count(*) from public.favorites where family_id = p_family_id),
    'open_tasks', (
      select count(*) from public.tasks
      where family_id = p_family_id and status in ('open', 'in_progress')
    )
  );
end;
$$;

grant execute on function public.family_dashboard_stats to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: community_intake_queue
-- ---------------------------------------------------------------------------
create or replace function public.community_intake_queue(
  p_community_id uuid,
  p_statuses public.application_status[] default null,
  p_limit integer default 50,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  senior_id uuid,
  family_id uuid,
  status public.application_status,
  submitted_at timestamptz,
  last_activity_at timestamptz,
  completion_percentage integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_community_permission(p_community_id, 'view_applications') then
    raise exception 'not authorized';
  end if;

  return query
  select
    a.id,
    a.senior_id,
    a.family_id,
    a.status,
    a.submitted_at,
    a.last_activity_at,
    a.completion_percentage
  from public.applications a
  where a.community_id = p_community_id
    and a.deleted_at is null
    and a.status <> 'draft'
    and (p_statuses is null or a.status = any (p_statuses))
    and (p_cursor is null or a.last_activity_at < p_cursor)
  order by a.last_activity_at desc
  limit greatest(1, least(p_limit, 200));
end;
$$;

grant execute on function public.community_intake_queue to authenticated;


-- =============================================================================
-- FILE: buckets.sql
-- =============================================================================

-- HavenApply Storage buckets
-- Apply via Supabase SQL editor or storage admin API after project creation.
-- Paths are enforced in Edge Functions; buckets themselves are private except community-media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'senior-documents',
    'senior-documents',
    false,
    52428800, -- 50 MB
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'message-attachments',
    'message-attachments',
    false,
    26214400, -- 25 MB
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ]
  ),
  (
    'community-media',
    'community-media',
    true,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'exports',
    'exports',
    false,
    104857600, -- 100 MB
    array['application/zip', 'application/json', 'text/csv', 'application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deny direct client Storage access for PHI buckets.
-- Uploads/downloads must go through Edge Functions (signed URLs after AuthZ).

drop policy if exists senior_documents_no_direct on storage.objects;
create policy senior_documents_no_direct on storage.objects
  for all to authenticated
  using (bucket_id <> 'senior-documents')
  with check (bucket_id <> 'senior-documents');

-- community-media: public read
drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read on storage.objects
  for select
  using (bucket_id = 'community-media');

-- Path conventions (enforced in Edge Functions, not SQL):
-- senior-documents:     {family_id}/{senior_id}/{document_id}/v{version}
-- message-attachments:  {conversation_id}/{message_id}/{filename}
-- community-media:      {organization_id}/{community_id}/{asset_id}
-- exports:              {user_id}/{export_id}



-- =============================================================================
-- FILE: 0009_site_access_logs.sql
-- =============================================================================

-- HavenApply 0009: site access gate security logs
-- No passwords, no raw IPs. ip_hash is HMAC-SHA256 computed in the app.

create table if not exists public.site_access_logs (
  id uuid primary key,
  created_at timestamptz not null default timezone('utc', now()),
  visitor_id uuid not null,
  device_category text not null check (device_category in ('mobile', 'tablet', 'desktop', 'unknown')),
  os_name text not null default '',
  os_version text not null default '',
  browser_name text not null default '',
  browser_major_version text not null default '',
  browser_language text,
  time_zone text,
  entry_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  hostname text,
  country text,
  region text,
  ip_hash text,
  gate_version text not null,
  unique (visitor_id, gate_version)
);

create index if not exists site_access_logs_created_at_idx
  on public.site_access_logs (created_at desc);

create index if not exists site_access_logs_device_idx
  on public.site_access_logs (device_category);

create table if not exists public.site_access_failed_daily (
  day date primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_access_logs enable row level security;
alter table public.site_access_failed_daily enable row level security;

-- Deny all direct client access; service role / SECURITY DEFINER only.
drop policy if exists site_access_logs_deny_all on public.site_access_logs;
create policy site_access_logs_deny_all on public.site_access_logs
  for all
  using (false)
  with check (false);

drop policy if exists site_access_failed_deny_all on public.site_access_failed_daily;
create policy site_access_failed_deny_all on public.site_access_failed_daily
  for all
  using (false)
  with check (false);

create or replace function public.purge_site_access_logs(p_retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_retention_days < 1 then
    raise exception 'retention days must be >= 1';
  end if;
  delete from public.site_access_logs
  where created_at < timezone('utc', now()) - make_interval(days => p_retention_days);
  get diagnostics v_count = row_count;
  delete from public.site_access_failed_daily
  where day < (timezone('utc', now()) - make_interval(days => p_retention_days))::date;
  return v_count;
end;
$$;

revoke all on function public.purge_site_access_logs(integer) from public;
grant execute on function public.purge_site_access_logs(integer) to service_role;
