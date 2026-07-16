begin;

create type cooksmith.pantry_storage_location as enum ('pantry', 'fridge', 'freezer');
create type cooksmith.pantry_item_category as enum (
  'staples', 'baking', 'canned_goods', 'condiments', 'spices', 'fresh', 'frozen', 'drinks', 'household'
);

create table cooksmith.household_pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  name text not null,
  normalised_name text generated always as (lower(btrim(name))) stored,
  category cooksmith.pantry_item_category not null,
  storage_location cooksmith.pantry_storage_location not null,
  quantity numeric(8, 2) not null default 1,
  unit text not null default 'item',
  available boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_pantry_items_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint household_pantry_items_unit_length check (char_length(btrim(unit)) between 1 and 40),
  constraint household_pantry_items_quantity_range check (quantity >= 0 and quantity <= 99999),
  constraint household_pantry_items_household_name_unique unique (household_id, normalised_name)
);

create index household_pantry_items_household_category_idx
  on cooksmith.household_pantry_items (household_id, category, normalised_name);
create index household_pantry_items_household_location_idx
  on cooksmith.household_pantry_items (household_id, storage_location, normalised_name);
create index household_pantry_items_created_by_idx on cooksmith.household_pantry_items (created_by);
create index household_pantry_items_updated_by_idx on cooksmith.household_pantry_items (updated_by);

create trigger household_pantry_items_set_updated_at
before update on cooksmith.household_pantry_items
for each row execute function cooksmith.set_updated_at();

comment on table cooksmith.household_pantry_items is
  'Private household-owned pantry, fridge and freezer item records for Milestone 7A.';

create function cooksmith_private.populate_default_pantry(target_household_id uuid, actor_id uuid default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if target_household_id is null then
    raise exception 'Household is required.' using errcode = '22023';
  end if;

  insert into cooksmith.household_pantry_items (
    household_id, name, category, storage_location, quantity, unit, available, is_default, created_by, updated_by
  )
  values
    (target_household_id, 'Plain flour', 'baking', 'pantry', 1, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'Self-raising flour', 'baking', 'pantry', 1, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'Caster sugar', 'baking', 'pantry', 1, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'Rolled oats', 'staples', 'pantry', 1, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'White rice', 'staples', 'pantry', 2, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'Pasta', 'staples', 'pantry', 1, 'kg', true, true, actor_id, actor_id),
    (target_household_id, 'Olive oil', 'condiments', 'pantry', 1, 'bottle', true, true, actor_id, actor_id),
    (target_household_id, 'Vegemite', 'condiments', 'pantry', 1, 'jar', true, true, actor_id, actor_id),
    (target_household_id, 'Soy sauce', 'condiments', 'pantry', 1, 'bottle', true, true, actor_id, actor_id),
    (target_household_id, 'Tinned tomatoes', 'canned_goods', 'pantry', 4, 'tin', true, true, actor_id, actor_id),
    (target_household_id, 'Tinned tuna', 'canned_goods', 'pantry', 4, 'tin', true, true, actor_id, actor_id),
    (target_household_id, 'Chickpeas', 'canned_goods', 'pantry', 2, 'tin', true, true, actor_id, actor_id),
    (target_household_id, 'Salt', 'spices', 'pantry', 1, 'packet', true, true, actor_id, actor_id),
    (target_household_id, 'Black pepper', 'spices', 'pantry', 1, 'jar', true, true, actor_id, actor_id),
    (target_household_id, 'Mixed herbs', 'spices', 'pantry', 1, 'jar', true, true, actor_id, actor_id),
    (target_household_id, 'Milk', 'fresh', 'fridge', 2, 'L', true, true, actor_id, actor_id),
    (target_household_id, 'Eggs', 'fresh', 'fridge', 12, 'each', true, true, actor_id, actor_id),
    (target_household_id, 'Butter', 'fresh', 'fridge', 500, 'g', true, true, actor_id, actor_id),
    (target_household_id, 'Cheddar cheese', 'fresh', 'fridge', 500, 'g', true, true, actor_id, actor_id),
    (target_household_id, 'Frozen peas', 'frozen', 'freezer', 1, 'kg', true, true, actor_id, actor_id)
  on conflict (household_id, normalised_name) do nothing;
end;
$$;

comment on function cooksmith_private.populate_default_pantry(uuid, uuid) is
  'Deterministically and idempotently inserts the curated Australian default pantry catalogue for one household.';

create function cooksmith_private.populate_default_pantry_after_household()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform cooksmith_private.populate_default_pantry(new.id, new.created_by);
  return new;
end;
$$;

create trigger households_populate_default_pantry
after insert on cooksmith.households
for each row execute function cooksmith_private.populate_default_pantry_after_household();

select cooksmith_private.populate_default_pantry(household.id, household.created_by)
from cooksmith.households as household
where household.status = 'active';

alter table cooksmith.household_pantry_items enable row level security;
grant select, insert, update, delete on cooksmith.household_pantry_items to authenticated;

create policy pantry_items_select_active_member
on cooksmith.household_pantry_items
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy pantry_items_insert_active_member
on cooksmith.household_pantry_items
for insert
to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy pantry_items_update_active_member
on cooksmith.household_pantry_items
for update
to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));

create policy pantry_items_delete_active_member
on cooksmith.household_pantry_items
for delete
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

revoke all on function cooksmith_private.populate_default_pantry(uuid, uuid) from public, anon, authenticated;
revoke all on function cooksmith_private.populate_default_pantry_after_household() from public, anon, authenticated;

grant execute on function cooksmith_private.populate_default_pantry(uuid, uuid) to authenticated;

commit;
