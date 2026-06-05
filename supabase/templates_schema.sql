create extension if not exists "pgcrypto";

create table if not exists public.program_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  template_data jsonb not null default '{}'::jsonb,
  canvas_width integer,
  canvas_height integer,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_status_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  template_data jsonb not null default '{}'::jsonb,
  canvas_width integer,
  canvas_height integer,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.framed_post_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  template_data jsonb not null default '{}'::jsonb,
  canvas_width integer,
  canvas_height integer,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  template_data jsonb not null default '{}'::jsonb,
  canvas_width integer,
  canvas_height integer,
  preview_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_templates_user_event_idx on public.program_templates(user_id, event_id);
create index if not exists team_status_templates_user_event_idx on public.team_status_templates(user_id, event_id);
create index if not exists framed_post_templates_user_event_idx on public.framed_post_templates(user_id, event_id);
create index if not exists certificate_templates_user_event_idx on public.certificate_templates(user_id, event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_program_templates_updated_at on public.program_templates;
create trigger set_program_templates_updated_at
before update on public.program_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_team_status_templates_updated_at on public.team_status_templates;
create trigger set_team_status_templates_updated_at
before update on public.team_status_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_framed_post_templates_updated_at on public.framed_post_templates;
create trigger set_framed_post_templates_updated_at
before update on public.framed_post_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_certificate_templates_updated_at on public.certificate_templates;
create trigger set_certificate_templates_updated_at
before update on public.certificate_templates
for each row execute function public.set_updated_at();

alter table public.program_templates enable row level security;
alter table public.team_status_templates enable row level security;
alter table public.framed_post_templates enable row level security;
alter table public.certificate_templates enable row level security;

alter table public.program_templates force row level security;
alter table public.team_status_templates force row level security;
alter table public.framed_post_templates force row level security;
alter table public.certificate_templates force row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'program_templates',
        'team_status_templates',
        'framed_post_templates',
        'certificate_templates'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy "Users can select own program templates" on public.program_templates
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own program templates" on public.program_templates
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own program templates" on public.program_templates
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own program templates" on public.program_templates
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own team status templates" on public.team_status_templates
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own team status templates" on public.team_status_templates
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own team status templates" on public.team_status_templates
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own team status templates" on public.team_status_templates
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own framed post templates" on public.framed_post_templates
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own framed post templates" on public.framed_post_templates
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own framed post templates" on public.framed_post_templates
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own framed post templates" on public.framed_post_templates
for delete to authenticated using (auth.uid() = user_id);

create policy "Users can select own certificate templates" on public.certificate_templates
for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own certificate templates" on public.certificate_templates
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own certificate templates" on public.certificate_templates
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own certificate templates" on public.certificate_templates
for delete to authenticated using (auth.uid() = user_id);
