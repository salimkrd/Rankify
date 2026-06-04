create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.public_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  description text,
  canvas_width integer not null default 1080,
  canvas_height integer not null default 1350,
  template_data jsonb not null default '{}'::jsonb,
  preview_image text,
  background_image text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_templates
  add column if not exists canvas_width integer not null default 1080,
  add column if not exists canvas_height integer not null default 1350,
  add column if not exists background_image text;

create index if not exists public_templates_type_idx on public.public_templates(type);
create index if not exists public_templates_published_idx on public.public_templates(is_published);
create index if not exists public_templates_created_at_idx on public.public_templates(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_templates_updated_at on public.public_templates;
create trigger set_public_templates_updated_at
before update on public.public_templates
for each row
execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.public_templates enable row level security;

drop policy if exists "Users can read own admin record" on public.admin_users;
create policy "Users can read own admin record"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Everyone can read published public templates" on public.public_templates;
create policy "Everyone can read published public templates"
on public.public_templates
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins can read all public templates" on public.public_templates;
create policy "Admins can read all public templates"
on public.public_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can create public templates" on public.public_templates;
create policy "Admins can create public templates"
on public.public_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update public templates" on public.public_templates;
create policy "Admins can update public templates"
on public.public_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can delete public templates" on public.public_templates;
create policy "Admins can delete public templates"
on public.public_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
