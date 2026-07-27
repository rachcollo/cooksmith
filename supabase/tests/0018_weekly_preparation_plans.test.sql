begin;
select plan(8);

select has_table('cooksmith', 'weekly_preparation_plans', 'Weekly preparation plan cache exists');
select has_table('cooksmith', 'weekly_preparation_settings', 'Weekly preparation settings exist');
select ok(
  (select relrowsecurity
   from pg_catalog.pg_class
   join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where pg_namespace.nspname = 'cooksmith'
     and pg_class.relname = 'weekly_preparation_plans'),
  'Weekly preparation plan cache has row-level security enabled'
);
select ok(
  (select relrowsecurity
   from pg_catalog.pg_class
   join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where pg_namespace.nspname = 'cooksmith'
     and pg_class.relname = 'weekly_preparation_settings'),
  'Weekly preparation settings have row-level security enabled'
);
select has_index(
  'cooksmith',
  'weekly_preparation_plans',
  'weekly_preparation_plans_cache_unique',
  'Weekly preparation plan cache key is unique per household and plan'
);
select isnt_empty(
  $$select 1
    from pg_constraint
    where conrelid = 'cooksmith.weekly_preparation_plans'::regclass
      and contype = 'c'
      and conname = 'weekly_preparation_plans_generation_valid'$$,
  'Weekly preparation plan generation mode is constrained'
);
select isnt_empty(
  $$select 1
    from pg_constraint
    where conrelid = 'cooksmith.weekly_preparation_plans'::regclass
      and contype = 'c'
      and conname = 'weekly_preparation_plans_result_object'$$,
  'Weekly preparation plan result is a JSON object'
);
select isnt_empty(
  $$select 1 from pg_policies
    where schemaname = 'cooksmith'
      and tablename = 'weekly_preparation_plans'
      and policyname = 'weekly_preparation_plans_select_household'$$,
  'weekly plan reads have a household membership policy'
);

select * from finish();
rollback;
