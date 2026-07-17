begin;

create type cooksmith.pantry_storage_location as enum ('pantry', 'fridge', 'freezer');

alter table cooksmith.household_pantry_items
  add column storage_location cooksmith.pantry_storage_location;

update cooksmith.household_pantry_items
set storage_location = 'pantry'
where storage_location is null;

alter table cooksmith.household_pantry_items
  alter column storage_location set default 'pantry',
  alter column storage_location set not null;

create index household_pantry_items_household_location_name_idx
  on cooksmith.household_pantry_items (household_id, storage_location, normalised_name);

create function cooksmith_private.populate_new_household_staples(target_household_id uuid)
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
    household_id, name, category, storage_location, quantity, unit, available, is_default
  )
  values
    (target_household_id, 'Milk', 'tea_coffee_and_drinks', 'fridge', null, null, true, true),
    (target_household_id, 'Eggs', 'breakfast', 'fridge', null, null, true, true),
    (target_household_id, 'Butter', 'baking', 'fridge', null, null, true, true),
    (target_household_id, 'Cheddar cheese', 'other', 'fridge', null, null, true, true),
    (target_household_id, 'Yoghurt', 'breakfast', 'fridge', null, null, true, true),
    (target_household_id, 'Mayonnaise', 'condiments_and_sauces', 'fridge', null, null, true, true),
    (target_household_id, 'Mustard', 'condiments_and_sauces', 'fridge', null, null, true, true),
    (target_household_id, 'Frozen peas', 'other', 'freezer', null, null, true, true),
    (target_household_id, 'Frozen mixed vegetables', 'other', 'freezer', null, null, true, true),
    (target_household_id, 'Bread', 'other', 'freezer', null, null, true, true),
    (target_household_id, 'Frozen berries', 'breakfast', 'freezer', null, null, true, true)
  on conflict (household_id, normalised_name) do nothing;
end;
$$;

create or replace function cooksmith_private.populate_default_pantry(target_household_id uuid)
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
    household_id, name, category, storage_location, quantity, unit, available, is_default
  )
  values
    (target_household_id, 'Plain flour', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Self-raising flour', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Baking powder', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Bicarbonate of soda', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Caster sugar', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Brown sugar', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Cocoa powder', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Vanilla extract', 'baking', 'pantry', null, null, true, true),
    (target_household_id, 'Rolled oats', 'breakfast', 'pantry', null, null, true, true),
    (target_household_id, 'Weet-Bix', 'breakfast', 'pantry', null, null, true, true),
    (target_household_id, 'Corn flakes', 'breakfast', 'pantry', null, null, true, true),
    (target_household_id, 'Muesli', 'breakfast', 'pantry', null, null, true, true),
    (target_household_id, 'White rice', 'grains_rice_and_pasta', 'pantry', null, null, true, true),
    (target_household_id, 'Brown rice', 'grains_rice_and_pasta', 'pantry', null, null, true, true),
    (target_household_id, 'Pasta', 'grains_rice_and_pasta', 'pantry', null, null, true, true),
    (target_household_id, 'Noodles', 'grains_rice_and_pasta', 'pantry', null, null, true, true),
    (target_household_id, 'Couscous', 'grains_rice_and_pasta', 'pantry', null, null, true, true),
    (target_household_id, 'Tinned tomatoes', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Tomato paste', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Tinned tuna', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Chickpeas', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Kidney beans', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Baked beans', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Lentils', 'canned_and_jarred', 'pantry', null, null, true, true),
    (target_household_id, 'Vegemite', 'condiments_and_sauces', 'pantry', null, null, true, true),
    (target_household_id, 'Soy sauce', 'condiments_and_sauces', 'pantry', null, null, true, true),
    (target_household_id, 'Tomato sauce', 'condiments_and_sauces', 'pantry', null, null, true, true),
    (target_household_id, 'Worcestershire sauce', 'condiments_and_sauces', 'pantry', null, null, true, true),
    (target_household_id, 'Honey', 'condiments_and_sauces', 'pantry', null, null, true, true),
    (target_household_id, 'Jam', 'condiments_and_sauces', 'fridge', null, null, true, true),
    (target_household_id, 'Olive oil', 'oils_and_vinegars', 'pantry', null, null, true, true),
    (target_household_id, 'Vegetable oil', 'oils_and_vinegars', 'pantry', null, null, true, true),
    (target_household_id, 'White vinegar', 'oils_and_vinegars', 'pantry', null, null, true, true),
    (target_household_id, 'Apple cider vinegar', 'oils_and_vinegars', 'pantry', null, null, true, true),
    (target_household_id, 'Salt', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Black pepper', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Mixed herbs', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Paprika', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Ground cumin', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Curry powder', 'herbs_and_spices', 'pantry', null, null, true, true),
    (target_household_id, 'Tea bags', 'tea_coffee_and_drinks', 'pantry', null, null, true, true),
    (target_household_id, 'Instant coffee', 'tea_coffee_and_drinks', 'pantry', null, null, true, true),
    (target_household_id, 'Milo', 'tea_coffee_and_drinks', 'pantry', null, null, true, true),
    (target_household_id, 'Crackers', 'snacks', 'pantry', null, null, true, true),
    (target_household_id, 'Popcorn kernels', 'snacks', 'pantry', null, null, true, true),
    (target_household_id, 'Sultanas', 'snacks', 'pantry', null, null, true, true),
    (target_household_id, 'Stock cubes', 'other', 'pantry', null, null, true, true),
    (target_household_id, 'Breadcrumbs', 'other', 'pantry', null, null, true, true)
  on conflict (household_id, normalised_name) do nothing;

  perform cooksmith_private.populate_new_household_staples(target_household_id);
end;
$$;

comment on column cooksmith.household_pantry_items.storage_location is
  'Simple organisational location for a household staple; not an inventory or food-safety signal.';

comment on function cooksmith_private.populate_new_household_staples(uuid) is
  'Idempotently inserts only the refrigerated and frozen staples introduced by Milestone 7B.';

comment on function cooksmith_private.populate_default_pantry(uuid) is
  'Deterministically inserts the curated Australian household staples catalogue across Pantry, Fridge and Freezer.';

select cooksmith_private.populate_new_household_staples(household.id)
from cooksmith.households as household
where household.status = 'active';

revoke all on function cooksmith_private.populate_new_household_staples(uuid) from public, anon, authenticated;
revoke all on function cooksmith_private.populate_default_pantry(uuid) from public, anon, authenticated;

commit;