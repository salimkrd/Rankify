create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date text,
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  team_name text,
  category_id uuid not null references public.categories(id) on delete cascade,
  category_name text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists teams_user_event_idx on public.teams(user_id, event_id);
create index if not exists categories_user_event_idx on public.categories(user_id, event_id);
create index if not exists participants_user_event_idx on public.participants(user_id, event_id);
create index if not exists participants_team_idx on public.participants(team_id);
create index if not exists participants_category_idx on public.participants(category_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_participants_updated_at on public.participants;
create trigger set_participants_updated_at
before update on public.participants
for each row
execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.categories enable row level security;
alter table public.participants enable row level security;

drop policy if exists "Users can select own events" on public.events;
create policy "Users can select own events" on public.events
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own events" on public.events;
create policy "Users can insert own events" on public.events
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own events" on public.events;
create policy "Users can update own events" on public.events
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own events" on public.events;
create policy "Users can delete own events" on public.events
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select own teams" on public.teams;
create policy "Users can select own teams" on public.teams
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own teams" on public.teams;
create policy "Users can insert own teams" on public.teams
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = teams.event_id
      and events.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own teams" on public.teams;
create policy "Users can update own teams" on public.teams
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = teams.event_id
      and events.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own teams" on public.teams;
create policy "Users can delete own teams" on public.teams
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select own categories" on public.categories;
create policy "Users can select own categories" on public.categories
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories" on public.categories
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = categories.event_id
      and events.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories" on public.categories
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = categories.event_id
      and events.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories" on public.categories
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select own participants" on public.participants;
create policy "Users can select own participants" on public.participants
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own participants" on public.participants;
create policy "Users can insert own participants" on public.participants
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = participants.event_id
      and events.user_id = auth.uid()
  )
  and exists (
    select 1 from public.teams
    where teams.id = participants.team_id
      and teams.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories
    where categories.id = participants.category_id
      and categories.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own participants" on public.participants;
create policy "Users can update own participants" on public.participants
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events
    where events.id = participants.event_id
      and events.user_id = auth.uid()
  )
  and exists (
    select 1 from public.teams
    where teams.id = participants.team_id
      and teams.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories
    where categories.id = participants.category_id
      and categories.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own participants" on public.participants;
create policy "Users can delete own participants" on public.participants
for delete to authenticated
using (user_id = auth.uid());

