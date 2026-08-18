-- HavenApply 0010: auth security events (hashed identifiers only)

create table if not exists public.auth_security_events (
  id uuid primary key,
  created_at timestamptz not null default timezone('utc', now()),
  event_type text not null,
  role text,
  user_id_hash text,
  email_hash text,
  ip_hash text,
  user_agent text,
  detail text
);

create index if not exists auth_security_events_created_at_idx
  on public.auth_security_events (created_at desc);

create index if not exists auth_security_events_type_idx
  on public.auth_security_events (event_type);

alter table public.auth_security_events enable row level security;

drop policy if exists auth_security_events_deny_all on public.auth_security_events;
create policy auth_security_events_deny_all on public.auth_security_events
  for all
  using (false)
  with check (false);
