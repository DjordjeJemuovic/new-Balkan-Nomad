-- Store each signed-in user's saved destinations against their profile.

create table if not exists public.user_saved_locations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

create index if not exists user_saved_locations_location_id_idx
  on public.user_saved_locations (location_id);

alter table public.user_saved_locations enable row level security;

drop policy if exists "Users can view own saved locations" on public.user_saved_locations;
create policy "Users can view own saved locations"
on public.user_saved_locations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can save locations to own profile" on public.user_saved_locations;
create policy "Users can save locations to own profile"
on public.user_saved_locations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can remove locations from own profile" on public.user_saved_locations;
create policy "Users can remove locations from own profile"
on public.user_saved_locations
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.user_saved_locations from public, anon, authenticated;
grant select, insert, delete on public.user_saved_locations to authenticated;
