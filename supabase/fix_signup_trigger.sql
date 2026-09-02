-- HavenApply: fix signup "Database error saving new user"
-- Paste into Supabase → SQL Editor → Run

-- Make profile bootstrap never block Auth signup
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
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    updated_at = timezone('utc', now());
  return new;
exception
  when others then
    -- Never fail auth.users insert because of profile issues
    raise warning 'handle_new_user failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ensure auth admin can write profiles from the trigger
grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update on table public.profiles to postgres, service_role;
