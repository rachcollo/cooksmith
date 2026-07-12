-- Cooksmith MVP schema. Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  blurb text,
  time_minutes integer not null default 30 check (time_minutes > 0),
  serves integer not null default 4 check (serves > 0),
  tags jsonb not null default '["Mine"]'::jsonb,
  colour text not null default '#8B6E59',
  emoji text not null default '🍽️',
  ingredients jsonb not null default '[]'::jsonb,
  method jsonb not null default '[]'::jsonb,
  source_url text,
  created_at timestamptz not null default now()
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  amount text not null default 'some',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  day_key text not null check (day_key in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  recipe_id text not null,
  created_at timestamptz not null default now(),
  unique (household_id, day_key)
);

create or replace function public.my_household_id() returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare new_household uuid;
begin
  insert into public.households(name) values ('My household') returning id into new_household;
  insert into public.profiles(id, household_id, display_name) values (new.id, new_household, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.pantry_items enable row level security;
alter table public.meal_plan_items enable row level security;

create policy "household members read household" on public.households for select using (id = public.my_household_id());
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and household_id = public.my_household_id());

create policy "members read recipes" on public.recipes for select using (household_id = public.my_household_id());
create policy "members add recipes" on public.recipes for insert with check (household_id = public.my_household_id() and created_by = auth.uid());
create policy "members update recipes" on public.recipes for update using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy "members delete recipes" on public.recipes for delete using (household_id = public.my_household_id());

create policy "members read pantry" on public.pantry_items for select using (household_id = public.my_household_id());
create policy "members add pantry" on public.pantry_items for insert with check (household_id = public.my_household_id());
create policy "members update pantry" on public.pantry_items for update using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy "members delete pantry" on public.pantry_items for delete using (household_id = public.my_household_id());

create policy "members read meal plan" on public.meal_plan_items for select using (household_id = public.my_household_id());
create policy "members add meal plan" on public.meal_plan_items for insert with check (household_id = public.my_household_id());
create policy "members update meal plan" on public.meal_plan_items for update using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy "members delete meal plan" on public.meal_plan_items for delete using (household_id = public.my_household_id());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.households to authenticated;
grant select, insert, update, delete on public.recipes, public.pantry_items, public.meal_plan_items to authenticated;
