begin;
select no_plan();

select has_table('cooksmith', 'shopping_lists', 'Shopping-list container exists');
select has_table('cooksmith', 'shopping_list_items', 'Shopping-list items exist');
select col_is_pk('cooksmith', 'shopping_list_items', 'id', 'Shopping item id is the primary key');
select fk_ok(
  'cooksmith', 'shopping_list_items', 'household_id',
  'cooksmith', 'households', 'id',
  'Shopping items belong to valid households'
);

select results_eq(
  $$select count(*)::integer from cooksmith.shopping_lists where household_id = '20000000-0000-4000-8000-000000000001' and status = 'active'$$,
  array[1],
  'Existing households receive one active shopping list'
);

insert into cooksmith.shopping_list_items (household_id, shopping_list_id, display_name, quantity, unit, category)
values (
  '20000000-0000-4000-8000-000000000001',
  (select id from cooksmith.shopping_lists where household_id = '20000000-0000-4000-8000-000000000001' and status = 'active'),
  'Milk', 2, 'L', 'dairy_and_eggs'
);

select throws_ok(
  $$insert into cooksmith.shopping_list_items (household_id, shopping_list_id, display_name) values ('20000000-0000-4000-8000-000000000001', (select id from cooksmith.shopping_lists where household_id = '20000000-0000-4000-8000-000000000001' and status = 'active'), '  ')$$,
  '23514', null, 'Shopping item name is required'
);
select throws_ok(
  $$insert into cooksmith.shopping_list_items (household_id, shopping_list_id, display_name, quantity) values ('20000000-0000-4000-8000-000000000001', (select id from cooksmith.shopping_lists where household_id = '20000000-0000-4000-8000-000000000001' and status = 'active'), 'Bad quantity', -1)$$,
  '23514', null, 'Negative shopping quantities are rejected'
);
select throws_ok(
  $$insert into cooksmith.shopping_list_items (household_id, shopping_list_id, display_name) values ('20000000-0000-4000-8000-000000000001', (select id from cooksmith.shopping_lists where household_id = '20000000-0000-4000-8000-000000000001' and status = 'active'), 'milk')$$,
  '23505', null, 'Duplicate item names are prevented case-insensitively per household'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$select display_name from cooksmith.shopping_list_items where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array['Milk'::text],
  'Owner can read the household shopping list'
);
select lives_ok(
  $$insert into cooksmith.shopping_list_items (household_id, display_name, category) values ('20000000-0000-4000-8000-000000000001', 'Apples', 'produce')$$,
  'Owner can add an item without supplying a list identifier'
);
select results_eq(
  $$update cooksmith.shopping_list_items set completed = true where display_name = 'Apples' returning completed$$,
  array[true],
  'Owner can complete an item'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select results_eq(
  $$select count(*)::integer from cooksmith.shopping_list_items where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0],
  'Inactive member cannot read shopping items'
);
select throws_ok(
  $$insert into cooksmith.shopping_list_items (household_id, display_name) values ('20000000-0000-4000-8000-000000000001', 'Inactive item')$$,
  '42501', null, 'Inactive member cannot add shopping items'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$insert into cooksmith.shopping_list_items (household_id, display_name, created_by, updated_by) values ('20000000-0000-4000-8000-000000000001', 'Bread', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004')$$,
  'Active member can add a shopping item'
);
select results_eq(
  $$select created_by, updated_by from cooksmith.shopping_list_items where display_name = 'Bread'$$,
  $$values ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000002'::uuid)$$,
  'Shopping item audit identity is derived from auth.uid'
);
select throws_ok(
  $$insert into cooksmith.shopping_list_items (household_id, display_name) values ('20000000-0000-4000-8000-000000000002', 'Cross-household item')$$,
  '42501', null, 'Member cannot add to another household list'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq(
  $$select count(*)::integer from cooksmith.shopping_list_items where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0],
  'Unrelated user cannot read shopping items'
);
select results_eq(
  $$update cooksmith.shopping_list_items set completed = false where household_id = '20000000-0000-4000-8000-000000000001' returning id$$,
  array[]::uuid[],
  'Unrelated user cannot update shopping items'
);
select results_eq(
  $$delete from cooksmith.shopping_list_items where household_id = '20000000-0000-4000-8000-000000000001' returning id$$,
  array[]::uuid[],
  'Unrelated user cannot remove shopping items'
);

reset role;
select * from finish();
rollback;
