begin;

select no_plan();

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into cooksmith.planned_meals (id, household_id, meal_date, meal_type, title)
values
  ('80000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000001', '2026-08-21', 'dinner', 'Shared lentils one'),
  ('80000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000001', '2026-08-22', 'dinner', 'Shared lentils two');

select lives_ok(
  $$select cooksmith.reconcile_planned_meal_shopping(
    '20000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000021',
    '[{"name":"Lentils","quantity":1,"unit":"cup","category":"pantry"}]'::jsonb
  )$$,
  'First planned meal contributes its ingredients'
);
select lives_ok(
  $$select cooksmith.reconcile_planned_meal_shopping(
    '20000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000022',
    '[{"name":"lentils","quantity":2,"unit":"cup","category":"pantry"}]'::jsonb
  )$$,
  'Second planned meal contributes to the same item'
);
select results_eq(
  $$select quantity, unit from cooksmith.shopping_list_items
    where household_id = '20000000-0000-4000-8000-000000000001'
      and normalised_name = 'lentils'$$,
  $$values (3.00::numeric, 'cup'::text)$$,
  'Shared ingredient quantities aggregate across planned meals'
);

delete from cooksmith.planned_meals
where id = '80000000-0000-4000-8000-000000000021';

select results_eq(
  $$select quantity, unit from cooksmith.shopping_list_items
    where household_id = '20000000-0000-4000-8000-000000000001'
      and normalised_name = 'lentils'$$,
  $$values (2.00::numeric, 'cup'::text)$$,
  'Removing one meal preserves the other meal contribution'
);

delete from cooksmith.planned_meals
where id = '80000000-0000-4000-8000-000000000022';

select results_eq(
  $$select count(*)::integer from cooksmith.shopping_list_items
    where household_id = '20000000-0000-4000-8000-000000000001'
      and normalised_name = 'lentils'$$,
  array[0],
  'Removing the final meal removes the generated shopping item'
);

reset role;
select * from finish();
rollback;
