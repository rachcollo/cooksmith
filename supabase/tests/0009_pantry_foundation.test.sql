begin;

select no_plan();

select has_table('cooksmith', 'household_pantry_items', 'Pantry items table exists');
select has_function('cooksmith_private', 'populate_default_pantry', array['uuid'], 'Private default pantry population function exists');
select has_function('cooksmith_private', 'set_pantry_item_audit_fields', array[]::name[], 'Private pantry audit trigger function exists');

select ok(
  not has_function_privilege('public', 'cooksmith_private.populate_default_pantry(uuid)', 'execute')
  and not has_function_privilege('anon', 'cooksmith_private.populate_default_pantry(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'cooksmith_private.populate_default_pantry(uuid)', 'execute'),
  'Private default population function is not executable by browser roles'
);

select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001' and is_default$$,
  array[48],
  'Existing active households receive the curated default pantry catalogue'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001' and is_default$$,
  array[48],
  'Default catalogue size is within the approved 35 to 50 item range'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where category in ('baking','breakfast','canned_and_jarred','condiments_and_sauces','grains_rice_and_pasta','herbs_and_spices','oils_and_vinegars','snacks','tea_coffee_and_drinks','other')$$,
  array[96],
  'Defaults are pantry-only controlled categories across seeded households'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where name in ('Milk','Eggs','Butter','Cheddar cheese','Frozen peas')$$,
  array[0],
  'Non-shelf-stable defaults are excluded from Milestone 7A'
);

select lives_ok(
  $$select cooksmith_private.populate_default_pantry('20000000-0000-4000-8000-000000000001')$$,
  'Private migration path can rerun default population'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001' and is_default$$,
  array[48],
  'Repeated default population is idempotent'
);

insert into cooksmith.households (id, name, created_by, updated_by)
values ('20000000-0000-4000-8000-000000000099', 'Future household', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
select results_eq(
  $$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000099' and is_default$$,
  array[48],
  'Future households receive defaults from the database trigger'
);

delete from cooksmith.households where id = '20000000-0000-4000-8000-000000000099';

select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category)
    values ('20000000-0000-4000-8000-000000000001', 'plain FLOUR', 'baking')$$,
  '23505', null, 'Duplicate pantry names are prevented case-insensitively per household'
);
select lives_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'Optional quantity row', 'other', null, null)$$,
  'Quantity and unit may be null'
);
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, quantity, unit)
    values ('20000000-0000-4000-8000-000000000001', 'Invalid quantity', 'other', -1, null)$$,
  '23514', null, 'Negative quantity is rejected'
);
delete from cooksmith.household_pantry_items where name = 'Optional quantity row';


set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category)
    values ('20000000-0000-4000-8000-000000000001', 'Owner oats', 'breakfast')$$,
  'Owner can add pantry item'
);
select results_eq(
  $$update cooksmith.household_pantry_items set available = false where name = 'Owner oats' returning available$$,
  array[false],
  'Owner can edit pantry item'
);
select results_eq(
  $$delete from cooksmith.household_pantry_items where name = 'Owner oats' returning name$$,
  array['Owner oats'::text],
  'Owner can remove pantry item'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select cooksmith_private.populate_default_pantry('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'Authenticated clients cannot invoke private default population'
);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[48], 'Active member can view household pantry');
select lives_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category, quantity, unit, created_by, updated_by)
    values ('20000000-0000-4000-8000-000000000001', 'Member rice', 'grains_rice_and_pasta', null, null,
      '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004')$$,
  'Active member can add pantry item even when spoofed audit values are supplied'
);
select results_eq(
  $$select created_by, updated_by from cooksmith.household_pantry_items where name = 'Member rice'$$,
  $$values ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000002'::uuid)$$,
  'Created audit identity is derived from auth.uid, not caller-supplied values'
);
select results_eq(
  $$update cooksmith.household_pantry_items set available = false, updated_by = '10000000-0000-4000-8000-000000000004' where name = 'Member rice' returning available$$,
  array[false],
  'Availability persists through member update'
);
select results_eq(
  $$select updated_by from cooksmith.household_pantry_items where name = 'Member rice'$$,
  array['10000000-0000-4000-8000-000000000002'::uuid],
  'Updated audit identity is derived from auth.uid, not caller-supplied values'
);
select results_eq(
  $$delete from cooksmith.household_pantry_items where name = 'Member rice' returning name$$,
  array['Member rice'::text],
  'Active member can remove pantry item'
);
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category)
    values ('20000000-0000-4000-8000-000000000002', 'Cross tenant rice', 'grains_rice_and_pasta')$$,
  '42501', null, 'Member cannot add pantry item to another household'
);
select results_eq(
  $$update cooksmith.household_pantry_items set household_id = '20000000-0000-4000-8000-000000000002' where name = 'Plain flour' returning id$$,
  array[]::uuid[],
  'Cross-household movement is denied by RLS'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items where household_id = '20000000-0000-4000-8000-000000000001'$$, array[0], 'Cross-household pantry access is denied by RLS');
select results_eq($$update cooksmith.household_pantry_items set available = false where household_id = '20000000-0000-4000-8000-000000000001' returning id$$, array[]::uuid[], 'Cross-household pantry update is denied by RLS');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[0], 'Inactive member cannot view pantry');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[0], 'Unrelated user cannot view pantry');
select throws_ok(
  $$insert into cooksmith.household_pantry_items (household_id, name, category)
    values ('20000000-0000-4000-8000-000000000001', 'Blocked rice', 'grains_rice_and_pasta')$$,
  '42501', null, 'Unrelated user cannot add pantry item'
);

reset role;
insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('10000000-0000-4000-8000-000000000004', 'admin', '10000000-0000-4000-8000-000000000001')
on conflict (user_id, role) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq($$select count(*)::integer from cooksmith.household_pantry_items$$, array[0], 'Application-role-only user cannot view pantry');

reset role;
select * from finish();
rollback;
