create extension if not exists "pgcrypto";

create table if not exists public.program_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  template_id uuid,
  title text,
  result_data jsonb not null default '{}'::jsonb,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_status_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  template_id uuid,
  title text,
  result_data jsonb not null default '{}'::jsonb,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.framed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  template_id uuid,
  title text,
  result_data jsonb not null default '{}'::jsonb,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  template_id uuid,
  title text,
  result_data jsonb not null default '{}'::jsonb,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_results_user_event_idx on public.program_results(user_id, event_id);
create index if not exists team_status_results_user_event_idx on public.team_status_results(user_id, event_id);
create index if not exists framed_posts_user_event_idx on public.framed_posts(user_id, event_id);
create index if not exists certificate_results_user_event_idx on public.certificate_results(user_id, event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_program_results_updated_at on public.program_results;
create trigger set_program_results_updated_at
before update on public.program_results
for each row execute function public.set_updated_at();

drop trigger if exists set_team_status_results_updated_at on public.team_status_results;
create trigger set_team_status_results_updated_at
before update on public.team_status_results
for each row execute function public.set_updated_at();

drop trigger if exists set_framed_posts_updated_at on public.framed_posts;
create trigger set_framed_posts_updated_at
before update on public.framed_posts
for each row execute function public.set_updated_at();

drop trigger if exists set_certificate_results_updated_at on public.certificate_results;
create trigger set_certificate_results_updated_at
before update on public.certificate_results
for each row execute function public.set_updated_at();

alter table public.program_results enable row level security;
alter table public.team_status_results enable row level security;
alter table public.framed_posts enable row level security;
alter table public.certificate_results enable row level security;

alter table public.program_results force row level security;
alter table public.team_status_results force row level security;
alter table public.framed_posts force row level security;
alter table public.certificate_results force row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('program_results', 'team_status_results', 'framed_posts', 'certificate_results')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "Users can select own program results" on public.program_results
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own program results" on public.program_results
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own program results" on public.program_results
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own program results" on public.program_results
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own team status results" on public.team_status_results
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own team status results" on public.team_status_results
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own team status results" on public.team_status_results
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own team status results" on public.team_status_results
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own framed posts" on public.framed_posts
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own framed posts" on public.framed_posts
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own framed posts" on public.framed_posts
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own framed posts" on public.framed_posts
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own certificate results" on public.certificate_results
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own certificate results" on public.certificate_results
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own certificate results" on public.certificate_results
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own certificate results" on public.certificate_results
for delete to authenticated using (auth.uid() = user_id);
