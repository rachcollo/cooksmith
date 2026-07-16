begin;

select no_plan();

select has_table('cooksmith', 'household_pantry_items', 'Pantry items table exists');
select has_function('cooksmith_private', 'populate_default_pantry', array['uuid', 'uuid'], 'Default pantry population function exists');
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001' and is_default$$,
  array[20],
  'Existing active households receive the curated default pantry catalogue'
);
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, storage_location, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'plain FLOUR', 'baking', 'pantry', 1, 'kg')$$,
  '23505', null, 'Duplicate pantry names are prevented case-insensitively per household'
);
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, storage_location, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'Invalid quantity', 'staples', 'pantry', -1, 'item')$$,
  '23514', null, 'Quantity validation rejects negative values'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[20], 'Active member can view household pantry');
select lives_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, storage_location, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'Member rice', 'staples', 'pantry', 1, 'kg')$$,
  'Active member can add pantry item'
);
select results_eq(
  $$update cooksmith.household_pantry_items set available = false where name = 'Member rice' returning available$$,
  array[false],
  'Availability persists through member update'
);
select results_eq(
  $$delete from cooksmith.household_pantry_items where name = 'Member rice' returning name$$,
  array['Member rice'::text],
  'Active member can remove pantry item'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001'$$, array[0], 'Cross-household pantry access is denied by RLS');
select results_eq($$update cooksmith.household_pantry_items set available = false where household_id = '20000000-0000-4000-8000-000000000001' returning id$$, array[]::uuid[], 'Cross-household pantry update is denied by RLS');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[0], 'Inactive member cannot view pantry');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[0], 'Unrelated user cannot view pantry');
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, storage_location, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'Blocked rice', 'staples', 'pantry', 1, 'kg')$$,
  '42501', null, 'Unrelated user cannot add pantry item'
);

reset role;
select * from finish();
rollback;
