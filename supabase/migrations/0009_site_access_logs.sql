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
