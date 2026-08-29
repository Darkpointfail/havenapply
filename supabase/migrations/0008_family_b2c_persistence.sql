-- HavenApply 0008: B2C family persistence gaps (consents, emergency contacts,
-- applicant preferences, account deletion, profile progress metadata).

-- ---------------------------------------------------------------------------
-- Applicant / contact preferences on family account
-- ---------------------------------------------------------------------------
alter table public.families
  add column if not exists preferred_language text default 'fr',
  add column if not exists communication_preference text,
  add column if not exists relationship_to_senior text,
  add column if not exists profile_consent_version text,
  add column if not exists profile_consent_at timestamptz,
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists last_saved_at timestamptz;

comment on column public.families.profile_consent_version is
  'Version of the profile retention consent accepted by the family owner.';
comment on column public.families.profile_consent_at is
  'When the family owner consented to create and retain their profile (Loi 25).';

-- ---------------------------------------------------------------------------
-- Emergency contacts (normalized, not buried in freeform sections)
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  full_name text not null default '',
  relationship text,
  phone text,
  email text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists emergency_contacts_senior_idx
  on public.emergency_contacts (senior_id);
create index if not exists emergency_contacts_family_idx
  on public.emergency_contacts (family_id);

drop trigger if exists emergency_contacts_set_updated_at on public.emergency_contacts;
create trigger emergency_contacts_set_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Versioned consent ledger (profile retention vs future transmission)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.consent_purpose as enum (
    'profile_retention',
    'dossier_transmission'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  senior_id uuid references public.seniors (id) on delete set null,
  purpose public.consent_purpose not null,
  granted boolean not null,
  version text not null,
  purpose_text text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists consent_records_user_idx on public.consent_records (user_id);
create index if not exists consent_records_family_idx on public.consent_records (family_id);
create index if not exists consent_records_purpose_idx
  on public.consent_records (family_id, purpose, recorded_at desc);

comment on table public.consent_records is
  'Loi 25 consent ledger. profile_retention is active in B2C phase; dossier_transmission is recorded only when the family explicitly opts in later — never implied by profile creation.';

-- ---------------------------------------------------------------------------
-- Account / profile deletion requests
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.deletion_request_status as enum (
    'pending',
    'processing',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  scope text not null default 'account'
    check (scope in ('profile', 'account')),
  status public.deletion_request_status not null default 'pending',
  reason text,
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id, requested_at desc);

drop trigger if exists account_deletion_requests_set_updated_at
  on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Extra senior fields used by the Québec family UI
-- ---------------------------------------------------------------------------
alter table public.seniors
  add column if not exists desired_move_date text,
  add column if not exists urgency_level text,
  add column if not exists dossier_json jsonb not null default '{}'::jsonb,
  add column if not exists care_needs_completed_at timestamptz,
  add column if not exists current_step text;

-- ---------------------------------------------------------------------------
-- Original filename for documents (UI + audit)
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists original_filename text,
  add column if not exists category_detail text;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
alter table public.emergency_contacts enable row level security;
alter table public.consent_records enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists emergency_contacts_select on public.emergency_contacts;
create policy emergency_contacts_select on public.emergency_contacts
  for select using (public.is_family_member(family_id, 'viewer'));

drop policy if exists emergency_contacts_write on public.emergency_contacts;
create policy emergency_contacts_write on public.emergency_contacts
  for all using (public.is_family_editor(family_id))
  with check (public.is_family_editor(family_id));

drop policy if exists consent_records_select on public.consent_records;
create policy consent_records_select on public.consent_records
  for select using (
    user_id = auth.uid() or public.is_family_member(family_id, 'viewer')
  );

drop policy if exists consent_records_insert on public.consent_records;
create policy consent_records_insert on public.consent_records
  for insert with check (
    user_id = auth.uid() and public.is_family_editor(family_id)
  );

drop policy if exists consent_records_update on public.consent_records;
create policy consent_records_update on public.consent_records
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists account_deletion_requests_select on public.account_deletion_requests;
create policy account_deletion_requests_select on public.account_deletion_requests
  for select using (user_id = auth.uid());

drop policy if exists account_deletion_requests_insert on public.account_deletion_requests;
create policy account_deletion_requests_insert on public.account_deletion_requests
  for insert with check (user_id = auth.uid());

drop policy if exists account_deletion_requests_update on public.account_deletion_requests;
create policy account_deletion_requests_update on public.account_deletion_requests
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
