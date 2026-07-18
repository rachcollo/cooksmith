begin;
select no_plan();

select has_table('cooksmith', 'household_recipes', 'Recipe library table exists');
select col_is_pk('cooksmith', 'household_recipes', 'id', 'Recipe id is the primary key');
select fk_ok('cooksmith', 'household_recipes', 'household_id', 'cooksmith', 'households', 'id', 'Recipes belong to valid households');

insert into cooksmith.household_recipes (household_id, name, servings, prep_time_minutes, cook_time_minutes, source_url)
values ('20000000-0000-4000-8000-000000000001', 'Lentil soup', 4, 10, 30, 'https://example.invalid/lentil');

select throws_ok(
  $$insert into cooksmith.household_recipes (household_id, name) values ('20000000-0000-4000-8000-000000000001', '  ')$$,
  '23514', null, 'Recipe name is required'
);
select throws_ok(
  $$insert into cooksmith.household_recipes (household_id, name, servings) values ('20000000-0000-4000-8000-000000000001', 'Bad servings', -1)$$,
  '23514', null, 'Negative servings are rejected'
);
select throws_ok(
  $$insert into cooksmith.household_recipes (household_id, name, source_url) values ('20000000-0000-4000-8000-000000000001', 'Bad URL', 'javascript:alert(1)')$$,
  '23514', null, 'Unsafe source URL protocols are rejected'
);
select throws_ok(
  $$insert into cooksmith.household_recipes (household_id, name) values ('20000000-0000-4000-8000-000000000001', 'lentil SOUP')$$,
  '23505', null, 'Duplicate recipe names are prevented case-insensitively per household'
);

select has_column('cooksmith', 'recipe_ingredients', 'original_line_text', 'Ingredient derivation keeps original source line');
select has_column('cooksmith', 'recipe_ingredients', 'parser_version', 'Ingredient derivation records parser version');
select has_column('cooksmith', 'recipe_steps', 'original_line_text', 'Instruction derivation keeps original source line');
select has_column('cooksmith', 'recipe_steps', 'derivation_status', 'Instruction derivation records status');
select throws_ok(
  $$insert into cooksmith.recipe_ingredients (recipe_id, ingredient_name, original_line_text, derivation_status, position) values ((select id from cooksmith.household_recipes where name = 'Lentil soup'), 'lentils', '1 cup lentils', 'invented', 1)$$,
  '23514', null, 'Unsupported ingredient derivation states are rejected'
);


set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq($$select count(*)::integer from cooksmith.household_recipes where household_id = '20000000-0000-4000-8000-000000000001'$$, array[1], 'Owner can read household recipes');
select lives_ok($$insert into cooksmith.household_recipes (household_id, name) values ('20000000-0000-4000-8000-000000000001', 'Owner pasta')$$, 'Owner can create recipes');
select results_eq($$update cooksmith.household_recipes set archived_at = now() where name = 'Owner pasta' returning name$$, array['Owner pasta'::text], 'Owner can archive recipes');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok($$insert into cooksmith.household_recipes (household_id, name, created_by, updated_by) values ('20000000-0000-4000-8000-000000000001', 'Member stew', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004')$$, 'Active member can create recipes');
select results_eq($$select created_by, updated_by from cooksmith.household_recipes where name = 'Member stew'$$, $$values ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000002'::uuid)$$, 'Audit identity is derived from auth.uid');
select throws_ok($$insert into cooksmith.household_recipes (household_id, name) values ('20000000-0000-4000-8000-000000000002', 'Cross household curry')$$, '42501', null, 'Member cannot create recipes in another household');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq($$select count(*)::integer from cooksmith.household_recipes where household_id = '20000000-0000-4000-8000-000000000001'$$, array[0], 'Unrelated user cannot read recipes');
select results_eq($$update cooksmith.household_recipes set name = 'Blocked' where household_id = '20000000-0000-4000-8000-000000000001' returning id$$, array[]::uuid[], 'Unrelated user cannot mutate recipes');

reset role;
select * from finish();
rollback;
