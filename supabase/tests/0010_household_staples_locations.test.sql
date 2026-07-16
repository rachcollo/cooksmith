begin;
select plan(8);

select has_type('cooksmith', 'pantry_storage_location', 'storage location enum exists');
select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'cooksmith'
      and table_name = 'household_pantry_items'
      and column_name = 'storage_location'
      and is_nullable = 'NO'
  ),
  'storage location is required'
);
select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'cooksmith'
      and table_name = 'household_pantry_items'
      and column_name = 'storage_location'
      and column_default is not null
  ),
  'new staples default to pantry'
);
select is(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    join pg_type on pg_type.oid = enumtypid
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where nspname = 'cooksmith'
      and typname = 'pantry_storage_location'
  ),
  array['pantry','fridge','freezer']::text[],
  'only approved storage locations exist'
);
select ok(not has_function_privilege('authenticated', 'cooksmith_private.populate_default_pantry(uuid)', 'execute'), 'browser cannot populate defaults');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'pantry'), 'existing/default pantry staples exist');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'fridge'), 'fridge defaults exist');
select ok((select count(*) > 0 from cooksmith.household_pantry_items where storage_location = 'freezer'), 'freezer defaults exist');

select * from finish();
rollback;