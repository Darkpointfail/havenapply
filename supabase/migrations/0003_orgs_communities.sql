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
