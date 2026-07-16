begin;

create type cooksmith.pantry_item_category as enum (
  'baking',
  'breakfast',
  'canned_and_jarred',
  'condiments_and_sauces',
  'grains_rice_and_pasta',
  'herbs_and_spices',
  'oils_and_vinegars',
  'snacks',
  'tea_coffee_and_drinks',
  'other'
);

create table cooksmith.household_pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  name text not null,
  normalised_name text generated always as (lower(btrim(name))) stored,
  category cooksmith.pantry_item_category not null,
  quantity numeric(8, 2),
  unit text,
  available boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_pantry_items_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint household_pantry_items_unit_length check (
    unit is null or char_length(btrim(unit)) between 1 and 40
  ),
  constraint household_pantry_items_quantity_non_negative check (
    quantity is null or quantity >= 0
  ),
  constraint household_pantry_items_household_name_unique unique (household_id, normalised_name)
);

create index household_pantry_items_household_category_idx
  on cooksmith.household_pantry_items (household_id, category, normalised_name);
create index household_pantry_items_created_by_idx on cooksmith.household_pantry_items (created_by);
create index household_pantry_items_updated_by_idx on cooksmith.household_pantry_items (updated_by);

create function cooksmith_private.set_pantry_item_audit_fields()
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

create trigger household_pantry_items_set_updated_at
before update on cooksmith.household_pantry_items
for each row execute function cooksmith.set_updated_at();

create trigger household_pantry_items_set_audit_fields
before insert or update on cooksmith.household_pantry_items
for each row execute function cooksmith_private.set_pantry_item_audit_fields();

comment on table cooksmith.household_pantry_items is
  'Private household-owned pantry item records for Milestone 7A.';

create function cooksmith_private.populate_default_pantry(target_household_id uuid)
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
    household_id, name, category, quantity, unit, available, is_default
  )
  values
    (target_household_id, 'Plain flour', 'baking', null, null, true, true),
    (target_household_id, 'Self-raising flour', 'baking', null, null, true, true),
    (target_household_id, 'Baking powder', 'baking', null, null, true, true),
    (target_household_id, 'Bicarbonate of soda', 'baking', null, null, true, true),
    (target_household_id, 'Caster sugar', 'baking', null, null, true, true),
    (target_household_id, 'Brown sugar', 'baking', null, null, true, true),
    (target_household_id, 'Cocoa powder', 'baking', null, null, true, true),
    (target_household_id, 'Vanilla extract', 'baking', null, null, true, true),
    (target_household_id, 'Rolled oats', 'breakfast', null, null, true, true),
    (target_household_id, 'Weet-Bix', 'breakfast', null, null, true, true),
    (target_household_id, 'Corn flakes', 'breakfast', null, null, true, true),
    (target_household_id, 'Muesli', 'breakfast', null, null, true, true),
    (target_household_id, 'White rice', 'grains_rice_and_pasta', null, null, true, true),
    (target_household_id, 'Brown rice', 'grains_rice_and_pasta', null, null, true, true),
    (target_household_id, 'Pasta', 'grains_rice_and_pasta', null, null, true, true),
    (target_household_id, 'Noodles', 'grains_rice_and_pasta', null, null, true, true),
    (target_household_id, 'Couscous', 'grains_rice_and_pasta', null, null, true, true),
    (target_household_id, 'Tinned tomatoes', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Tomato paste', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Tinned tuna', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Chickpeas', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Kidney beans', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Baked beans', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Lentils', 'canned_and_jarred', null, null, true, true),
    (target_household_id, 'Vegemite', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Soy sauce', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Tomato sauce', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Worcestershire sauce', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Honey', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Jam', 'condiments_and_sauces', null, null, true, true),
    (target_household_id, 'Olive oil', 'oils_and_vinegars', null, null, true, true),
    (target_household_id, 'Vegetable oil', 'oils_and_vinegars', null, null, true, true),
    (target_household_id, 'White vinegar', 'oils_and_vinegars', null, null, true, true),
    (target_household_id, 'Apple cider vinegar', 'oils_and_vinegars', null, null, true, true),
    (target_household_id, 'Salt', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Black pepper', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Mixed herbs', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Paprika', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Ground cumin', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Curry powder', 'herbs_and_spices', null, null, true, true),
    (target_household_id, 'Tea bags', 'tea_coffee_and_drinks', null, null, true, true),
    (target_household_id, 'Instant coffee', 'tea_coffee_and_drinks', null, null, true, true),
    (target_household_id, 'Milo', 'tea_coffee_and_drinks', null, null, true, true),
    (target_household_id, 'Crackers', 'snacks', null, null, true, true),
    (target_household_id, 'Popcorn kernels', 'snacks', null, null, true, true),
    (target_household_id, 'Sultanas', 'snacks', null, null, true, true),
    (target_household_id, 'Stock cubes', 'other', null, null, true, true),
    (target_household_id, 'Breadcrumbs', 'other', null, null, true, true)
  on conflict (household_id, normalised_name) do nothing;
end;
$$;

comment on function cooksmith_private.populate_default_pantry(uuid) is
  'Deterministically and idempotently inserts the curated Australian shelf-stable pantry catalogue for one household.';

create function cooksmith_private.populate_default_pantry_after_household()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform cooksmith_private.populate_default_pantry(new.id);
  return new;
end;
$$;

create trigger households_populate_default_pantry
after insert on cooksmith.households
for each row execute function cooksmith_private.populate_default_pantry_after_household();

select cooksmith_private.populate_default_pantry(household.id)
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

revoke all on function cooksmith_private.populate_default_pantry(uuid) from public, anon, authenticated;
revoke all on function cooksmith_private.populate_default_pantry_after_household() from public, anon, authenticated;
revoke all on function cooksmith_private.set_pantry_item_audit_fields() from public, anon, authenticated;

commit;
