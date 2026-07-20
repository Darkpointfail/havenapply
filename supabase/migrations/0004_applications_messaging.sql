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
