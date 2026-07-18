begin;

create type cooksmith.imported_recipe_visibility as enum ('public', 'private');

create table cooksmith.imported_recipes (
  id uuid primary key default gen_random_uuid(),
  visibility cooksmith.imported_recipe_visibility not null default 'public',
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  normalised_name text generated always as (lower(btrim(name))) stored,
  ingredients text,
  description text,
  ingredient_rows jsonb not null default '[]'::jsonb,
  instruction_steps jsonb not null default '[]'::jsonb,
  source_url text not null,
  normalised_source_url text generated always as (lower(btrim(source_url))) stored,
  author_name text,
  publisher_name text,
  servings integer,
  prep_time_minutes integer,
  cook_time_minutes integer,
  image_url text,
  notes text,
  category text,
  tags text[] not null default '{}',
  favourite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imported_recipes_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint imported_recipes_ingredients_length check (ingredients is null or char_length(btrim(ingredients)) <= 4000),
  constraint imported_recipes_description_length check (description is null or char_length(btrim(description)) <= 5000),
  constraint imported_recipes_ingredient_rows_array check (jsonb_typeof(ingredient_rows) = 'array'),
  constraint imported_recipes_instruction_steps_array check (jsonb_typeof(instruction_steps) = 'array'),
  constraint imported_recipes_source_url_web check (source_url ~* '^https?://'),
  constraint imported_recipes_author_length check (author_name is null or char_length(btrim(author_name)) <= 160),
  constraint imported_recipes_publisher_length check (publisher_name is null or char_length(btrim(publisher_name)) <= 160),
  constraint imported_recipes_servings_range check (servings is null or servings between 0 and 100),
  constraint imported_recipes_prep_time_range check (prep_time_minutes is null or prep_time_minutes between 0 and 1440),
  constraint imported_recipes_cook_time_range check (cook_time_minutes is null or cook_time_minutes between 0 and 1440),
  constraint imported_recipes_image_url_web check (image_url is null or image_url ~* '^https?://')
);

create unique index imported_recipes_public_source_unique on cooksmith.imported_recipes (normalised_source_url)
where visibility = 'public' and archived_at is null;
create unique index imported_recipes_private_owner_source_unique on cooksmith.imported_recipes (owner_id, normalised_source_url)
where visibility = 'private' and archived_at is null;
create index imported_recipes_visible_name_idx on cooksmith.imported_recipes (visibility, archived_at, normalised_name);

create trigger imported_recipes_set_updated_at before update on cooksmith.imported_recipes
for each row execute function cooksmith.set_updated_at();

alter table cooksmith.imported_recipes enable row level security;
grant select, insert, update on cooksmith.imported_recipes to authenticated;
create policy imported_recipes_select_visible on cooksmith.imported_recipes for select to authenticated
using (visibility = 'public' or owner_id = (select auth.uid()));
create policy imported_recipes_insert_owned on cooksmith.imported_recipes for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy imported_recipes_update_private_owner on cooksmith.imported_recipes for update to authenticated
using (owner_id = (select auth.uid()) and visibility = 'private')
with check (owner_id = (select auth.uid()) and visibility = 'private');

comment on table cooksmith.imported_recipes is 'Platform public recipe bank and strictly user-owned private URL imports.';
comment on column cooksmith.imported_recipes.author_name is 'Source-provided recipe author, separate from publisher attribution.';

commit;
