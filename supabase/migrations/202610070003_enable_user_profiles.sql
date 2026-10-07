-- Persist registration details on public profiles and safely allow each user
-- to read and edit their own profile. Auth remains the source for passwords.

alter table public.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_year smallint,
  add column if not exists interests text[] not null default '{}',
  add column if not exists avatar_url text;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile details" on public.profiles;
create policy "Users can update own profile details"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Limit profile updates to user-editable fields so clients cannot promote
-- their own account by changing the existing role column.
revoke update on public.profiles from public, anon, authenticated;
revoke update (role) on public.profiles from public, anon, authenticated;
revoke insert, delete on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, birth_year, interests, avatar_url)
  on public.profiles to authenticated;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_birth_year smallint;
  profile_interests text[];
begin
  if (new.raw_user_meta_data ->> 'birth_year') ~ '^[0-9]{4}$' then
    profile_birth_year := (new.raw_user_meta_data ->> 'birth_year')::smallint;
  else
    profile_birth_year := null;
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into profile_interests
  from jsonb_array_elements_text(
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'interests') = 'array'
        then new.raw_user_meta_data -> 'interests'
      else '[]'::jsonb
    end
  ) as interest(value);

  insert into public.profiles (
    id, email, first_name, last_name, birth_year, interests, avatar_url, role
  ) values (
    new.id,
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''),
    profile_birth_year,
    profile_interests,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    birth_year = excluded.birth_year,
    interests = excluded.interests,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists zzzz_sync_auth_user_profile on auth.users;
drop trigger if exists zzzz_sync_auth_user_profile_update on auth.users;
create trigger zzzz_sync_auth_user_profile
after insert on auth.users
for each row execute function public.sync_auth_user_profile();

create trigger zzzz_sync_auth_user_profile_update
after update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

-- Profile pictures use the existing public locations bucket under
-- profiles/<authenticated-user-id>/... .
drop policy if exists "Users can upload own profile photos" on storage.objects;
create policy "Users can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'locations'
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = auth.uid()::text
);
