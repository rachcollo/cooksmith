begin;

select no_plan();

select has_table('cooksmith', 'planned_meals', 'Planned meals table exists');
select col_is_fk('cooksmith', 'planned_meals', 'household_id', 'Planned meals belong to households');
select col_not_null('cooksmith', 'planned_meals', 'household_id', 'Household is required');
select col_not_null('cooksmith', 'planned_meals', 'meal_date', 'Meal date is required');
select col_not_null('cooksmith', 'planned_meals', 'meal_type', 'Meal type is required');
select col_not_null('cooksmith', 'planned_meals', 'title', 'Meal title is required');

select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-17', 'snack', 'Apples')$$,
  '22P02', null, 'Invalid meal types are rejected'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title)
    values ('99999999-0000-4000-8000-000000000001', '2026-07-17', 'dinner', 'Pasta')$$,
  '23503', null, 'Household foreign key is enforced'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-17', 'dinner', '   ')$$,
  '23514', null, 'Blank meal titles are rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, notes)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-17', 'breakfast', 'Porridge', 'Use oats')$$,
  'Owner can add a planned meal'
);
select results_eq(
  $$select title from cooksmith.planned_meals where household_id = '20000000-0000-4000-8000-000000000001' and meal_type = 'breakfast'$$,
  array['Porridge'::text],
  'Owner can read household planned meals'
);
select results_eq(
  $$update cooksmith.planned_meals set title = 'Warm porridge', meal_type = 'lunch' where title = 'Porridge' returning title$$,
  array['Warm porridge'::text],
  'Owner can edit a planned meal'
);
select results_eq(
  $$delete from cooksmith.planned_meals where title = 'Warm porridge' returning title$$,
  array['Warm porridge'::text],
  'Owner can remove a planned meal'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-18', 'dinner', 'Soup')$$,
  'Active member can add their household meal'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select results_eq(
  $$select count(*)::integer from cooksmith.planned_meals where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0],
  'Non-member cannot read another household plan'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-18', 'dinner', 'Blocked soup')$$,
  '42501', null, 'Non-member cannot add another household meal'
);
select results_eq(
  $$update cooksmith.planned_meals set household_id = '20000000-0000-4000-8000-000000000002' returning id$$,
  array[]::uuid[],
  'Non-member cannot mutate another household plan'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select results_eq($$select count(*)::integer from cooksmith.planned_meals$$, array[0], 'Inactive member cannot read planned meals');


reset role;
insert into cooksmith.household_recipes (id, household_id, name)
values
  ('70000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Lentil soup'),
  ('70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Fish pie')
on conflict (household_id, normalised_name) do nothing;

insert into cooksmith.imported_recipes (id, visibility, owner_id, name, source_url)
values
  ('71000000-0000-4000-8000-000000000001', 'public', '10000000-0000-4000-8000-000000000003', 'Public tray bake', 'https://example.com/public-tray-bake'),
  ('71000000-0000-4000-8000-000000000002', 'private', '10000000-0000-4000-8000-000000000001', 'Private family pie', 'https://example.com/private-family-pie'),
  ('71000000-0000-4000-8000-000000000003', 'private', '10000000-0000-4000-8000-000000000003', 'Another user recipe', 'https://example.com/another-user-recipe')
on conflict do nothing;

select col_is_fk('cooksmith', 'planned_meals', 'recipe_id', 'Planned meal recipe link is a foreign key');
select col_is_fk('cooksmith', 'planned_meals', 'imported_recipe_id', 'Imported planned meal recipe link is a foreign key');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-19', 'dinner', 'Soup snapshot', '70000000-0000-4000-8000-000000000001')$$,
  'Owner can link a household recipe to a planned meal'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-20', 'dinner', 'Cross-household fish pie', '70000000-0000-4000-8000-000000000002')$$,
  '23514', null, 'Cross-household recipe links are rejected by the database'
);
select lives_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, imported_recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-20', 'dinner', 'Public tray bake snapshot', '71000000-0000-4000-8000-000000000001')$$,
  'Owner can link a public recipe-bank item to a planned meal'
);
select lives_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, imported_recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-21', 'dinner', 'Private pie snapshot', '71000000-0000-4000-8000-000000000002')$$,
  'Owner can link their private recipe-bank item to a planned meal'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, imported_recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-22', 'dinner', 'Hidden recipe snapshot', '71000000-0000-4000-8000-000000000003')$$,
  '23514', null, 'A private recipe owned by another user cannot be linked'
);
select throws_ok(
  $$insert into cooksmith.planned_meals (household_id, meal_date, meal_type, title, recipe_id, imported_recipe_id)
    values ('20000000-0000-4000-8000-000000000001', '2026-07-23', 'dinner', 'Ambiguous link', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001')$$,
  '23514', null, 'A planned meal cannot link both recipe sources'
);
select results_eq(
  $$update cooksmith.household_recipes set archived_at = now() where id = '70000000-0000-4000-8000-000000000001' returning id$$,
  array['70000000-0000-4000-8000-000000000001'::uuid],
  'Recipe archive does not remove existing planned meals'
);
select results_eq(
  $$select title from cooksmith.planned_meals where recipe_id = '70000000-0000-4000-8000-000000000001'$$,
  array['Soup snapshot'::text],
  'Linked planned meal keeps its title snapshot after recipe archive'
);
select lives_ok(
  $$update cooksmith.planned_meals set recipe_id = null where title = 'Soup snapshot'$$,
  'Unlinking a recipe keeps the free-text planned meal valid'
);

reset role;
select * from finish();
rollback;
