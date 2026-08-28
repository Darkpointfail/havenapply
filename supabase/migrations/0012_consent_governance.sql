-- Consent & data governance (verifiable ledger + rights requests)
-- LEGAL PLACEHOLDER: counsel must confirm retention and lawful bases before production.

create table if not exists public.policy_text_versions (
  id text primary key,
  document_key text not null,
  version text not null,
  effective_from date not null,
  language text not null default 'en',
  body_placeholder text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families (id) on delete set null,
  consenter_user_id uuid references public.profiles (id) on delete set null,
  consenter_email text not null,
  consenter_role text not null check (consenter_role in ('resident','caregiver','legal_representative','other')),
  subject_display_name text not null,
  subject_role_hint text not null,
  policy_bundle_version_id text not null,
  purposes jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  authority_proof jsonb,
  establishments jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists consent_records_family_idx on public.consent_records (family_id);
create index if not exists consent_records_active_idx on public.consent_records (active) where active;

create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  reason_placeholder text not null,
  placed_at timestamptz not null default timezone('utc', now()),
  placed_by uuid references public.profiles (id),
  released_at timestamptz,
  data_categories text[] not null
);

create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('access_export','rectification','erasure_delete','erasure_anonymize')),
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  blocked_reason_placeholder text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.retention_policies (
  data_category text primary key,
  retain_days integer not null,
  action_on_expiry text not null check (action_on_expiry in ('delete','anonymize','archive_legal_hold')),
  rationale_placeholder text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- Abandoned applications: expire drafts after configurable days (default 90)
alter table public.applications
  add column if not exists abandon_expire_at timestamptz;

comment on table public.consent_records is
  'Verifiable consent ledger. Legal copy referenced by policy_bundle_version_id is counsel-owned.';
