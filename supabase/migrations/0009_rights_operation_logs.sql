-- HavenApply 0009: operational rights audit (Loi 25 access / export / deletion)

create table if not exists public.rights_operation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  operation text not null
    check (operation in (
      'access_view',
      'export',
      'rectify',
      'consent_revoke',
      'deletion_request',
      'deletion_executed'
    )),
  detail text,
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists rights_operation_logs_user_idx
  on public.rights_operation_logs (user_id, recorded_at desc);

alter table public.rights_operation_logs enable row level security;

drop policy if exists rights_operation_logs_select on public.rights_operation_logs;
create policy rights_operation_logs_select on public.rights_operation_logs
  for select using (user_id = auth.uid());

drop policy if exists rights_operation_logs_insert on public.rights_operation_logs;
create policy rights_operation_logs_insert on public.rights_operation_logs
  for insert with check (user_id = auth.uid());

comment on table public.rights_operation_logs is
  'Audit trail for Loi 25 operational rights exercised by the data subject. Avoid storing sensitive payload contents.';
