begin;

create table cooksmith.household_recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  name text not null,
  normalised_name text generated always as (lower(btrim(name))) stored,
  description text,
  source_note text,
  source_url text,
  servings integer,
  prep_time_minutes integer,
  cook_time_minutes integer,
  image_url text,
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_recipes_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint household_recipes_description_length check (description is null or char_length(btrim(description)) <= 1000),
  constraint household_recipes_source_note_length check (source_note is null or char_length(btrim(source_note)) <= 240),
  constraint household_recipes_servings_non_negative check (servings is null or servings >= 0),
  constraint household_recipes_prep_time_non_negative check (prep_time_minutes is null or prep_time_minutes >= 0),
  constraint household_recipes_cook_time_non_negative check (cook_time_minutes is null or cook_time_minutes >= 0),
  constraint household_recipes_source_url_web check (source_url is null or source_url ~* '^https?://'),
  constraint household_recipes_image_url_web check (image_url is null or image_url ~* '^https?://'),
  constraint household_recipes_household_name_unique unique (household_id, normalised_name)
);

create index household_recipes_household_active_name_idx on cooksmith.household_recipes (household_id, archived_at, normalised_name);
create index household_recipes_created_by_idx on cooksmith.household_recipes (created_by);
create index household_recipes_updated_by_idx on cooksmith.household_recipes (updated_by);

create function cooksmith_private.set_recipe_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by = caller_id;
  end if;
  new.updated_by = caller_id;
  return new;
end;
$$;

create trigger household_recipes_set_updated_at
before update on cooksmith.household_recipes
for each row execute function cooksmith.set_updated_at();

create trigger household_recipes_set_audit_fields
before insert or update on cooksmith.household_recipes
for each row execute function cooksmith_private.set_recipe_audit_fields();

alter table cooksmith.household_recipes enable row level security;
grant select, insert, update on cooksmith.household_recipes to authenticated;

create policy recipes_select_active_member
on cooksmith.household_recipes
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy recipes_insert_active_member
on cooksmith.household_recipes
for insert
to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy recipes_update_active_member
on cooksmith.household_recipes
for update
to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));


revoke all on function cooksmith_private.set_recipe_audit_fields() from public, anon, authenticated;

comment on table cooksmith.household_recipes is 'Private household-owned recipe summary records for Milestone 9A.';
comment on column cooksmith.household_recipes.archived_at is 'Soft-delete marker; active recipe library queries hide archived recipes by default.';

commit;
