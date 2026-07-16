begin;
select plan(8);

select has_type('cooksmith', 'pantry_storage_location', 'storage location enum exists');
select col_is_not_null('cooksmith', 'household_pantry_items', 'storage_location', 'storage location is required');
select col_has_default('cooksmith', 'household_pantry_items', 'storage_location', 'new staples default to pantry');
select results_eq(
  $$select enumlabel::text from pg_enum join pg_type on pg_type.oid = enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where nspname = 'cooksmith' and typname = 'pantry_storage_location' order by enumsortorder$$,
  $$values ('pantry'::text), ('fridge'::text), ('freezer'::text)$$,
  'only approved storage locations exist'
);
select ok(not has_function_privilege('authenticated', 'cooksmith_private.populate_default_pantry(uuid)', 'execute'), 'browser cannot populate defaults');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'pantry'), 'existing/default pantry staples exist');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'fridge'), 'fridge defaults exist');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'freezer'), 'freezer defaults exist');

select * from finish();
rollback;
