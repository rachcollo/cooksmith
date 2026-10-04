begin;
select no_plan();
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$select cooksmith.canonical_ingredient_name_v1(name) from (values ('Diced onions'),('ONIONS, thinly sliced'),('chopped onion'),('Garlic-powder'),('garlic powders'),('bell peppers'),('courgettes'),('cilantro'),('Greek yogurt'),('red onions'),('brown onions'),('frozen diced onions'),('pre-diced onions'),('canned chopped tomatoes'),('minced beef'),('2 onions'),('diced tomatoes')) corpus(name)$$,
  $$values ('onion'::text),('onion'),('onion'),('garlic powder'),('garlic powder'),('capsicum'),('zucchini'),('coriander'),('greek yoghurt'),('red onion'),('brown onion'),('frozen diced onion'),('pre diced onion'),('canned chopped tomato'),('minced beef'),('2 onions'),('diced tomato')$$,
  'SQL identity matches the TypeScript conservative corpus'
);
insert into cooksmith.planned_meals (id,household_id,meal_date,meal_type,title) values
 ('80000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000001','2026-10-04','dinner','Identity one'),
 ('80000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000001','2026-10-05','dinner','Identity two');
insert into cooksmith.shopping_list_items(household_id,display_name,quantity,manual,completed) values('20000000-0000-4000-8000-000000000001','onion',9,true,true);
select lives_ok($$select cooksmith.reconcile_planned_meal_shopping('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000071',
 '[{"name":"diced onions","quantity":1,"category":"produce"},{"name":"sliced onions","quantity":2,"unit":"each","category":"produce"},{"name":"chopped onion","quantity":1,"category":"produce"},{"name":"onion","quantity":1,"unit":"cup","category":"produce"},{"name":"carrot","quantity":0.5,"unit":"kg","category":"produce"},{"name":"carrots","quantity":250,"unit":"g","category":"produce"}]')$$,'Equivalent raw inputs reconcile');
select results_eq($$select quantity,unit from cooksmith.shopping_list_items where not manual and ingredient_identity='onion' order by unit nulls first$$,$$values (4::numeric,null::text),(1::numeric,'cup'::text)$$,'Count onion total is four; cup remains separate');
select results_eq($$select quantity,unit from cooksmith.shopping_list_items where not manual and ingredient_identity='carrot'$$,$$values (750::numeric,'g'::text)$$,'Metric scales sum safely');
select results_eq($$select quantity,completed from cooksmith.shopping_list_items where manual and normalised_name='onion'$$,$$values (9::numeric,true)$$,'Manual quantity and bought state remain untouched');
select is((select jsonb_array_length(source_quantities) from cooksmith.shopping_item_contributions c join cooksmith.shopping_list_items i on i.id=c.shopping_item_id where i.ingredient_identity='onion' and i.unit is null),3,'Original three recipe amounts retained');
create temporary table saved_identity as select id from cooksmith.shopping_list_items where not manual and ingredient_identity='onion' and unit is null;
update cooksmith.shopping_list_items set completed=true where id in (select id from saved_identity);
select cooksmith.reconcile_planned_meal_shopping('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000071','[{"name":"onions","quantity":4,"category":"produce"}]');
select is((select count(*)::integer from cooksmith.shopping_list_items where id in(select id from saved_identity) and completed and quantity=4),1,'Equivalent regeneration retains identity and bought state');
select cooksmith.reconcile_planned_meal_shopping('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000072','[{"name":"sliced onions","quantity":2,"category":"produce"}]');
select is((select quantity from cooksmith.shopping_list_items where id in(select id from saved_identity)),6::numeric,'Second meal adds only its contribution');
delete from cooksmith.planned_meals where id='80000000-0000-4000-8000-000000000071';
select is((select quantity from cooksmith.shopping_list_items where id in(select id from saved_identity)),2::numeric,'Deleting first meal preserves second contribution');
select throws_ok($$select cooksmith.reconcile_planned_meal_shopping('20000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000072','[]')$$,'42501',null,'Forged household cannot reconcile another household meal');
select throws_ok($$insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id) select '20000000-0000-4000-8000-000000000002',id,'80000000-0000-4000-8000-000000000072' from saved_identity$$,'42501',null,'Direct foreign household contribution rejected by RLS');
reset role;
insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title) values('80000000-0000-4000-8000-000000000073','20000000-0000-4000-8000-000000000002','2026-10-05','dinner','Other household');
insert into cooksmith.shopping_list_items(id,household_id,display_name,manual) values('90000000-0000-4000-8000-000000000073','20000000-0000-4000-8000-000000000002','Other household onion',true);
set local role authenticated;
select throws_ok($$insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id) select '20000000-0000-4000-8000-000000000001',id,'80000000-0000-4000-8000-000000000073' from saved_identity$$,'23503',null,'Own household contribution cannot reference a foreign meal');
select throws_ok($$insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id) values('20000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000073','80000000-0000-4000-8000-000000000072')$$,'23503',null,'Own household contribution cannot reference a foreign shopping item');
-- Exact duplicates must still support idempotent starter population; aliases must not be inserted.
insert into cooksmith.household_pantry_items(household_id,name,category) values('20000000-0000-4000-8000-000000000001','CS79 carrots','produce');
select throws_ok($$insert into cooksmith.household_pantry_items(household_id,name,category) values('20000000-0000-4000-8000-000000000001','CS79 carrots','produce')$$,'23505',null,'Exact duplicate remains protected');
insert into cooksmith.household_pantry_items(household_id,name,category) values('20000000-0000-4000-8000-000000000001','purple onions','produce');
select throws_ok($$insert into cooksmith.household_pantry_items(household_id,name,category) values('20000000-0000-4000-8000-000000000001','purple sliced onion','produce')$$,'23505',null,'Pantry prevents canonical aliases');
select lives_ok($$insert into cooksmith.household_pantry_items(household_id,name,category) values('20000000-0000-4000-8000-000000000001','purple onions','produce') on conflict(household_id,normalised_name) do nothing$$,'Starter population retains exact-name ON CONFLICT semantics');
reset role;
select * from finish();
rollback;
