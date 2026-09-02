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
