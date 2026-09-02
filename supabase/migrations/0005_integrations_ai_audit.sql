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
