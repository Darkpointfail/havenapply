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
