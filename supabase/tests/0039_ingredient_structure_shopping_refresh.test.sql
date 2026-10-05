begin;
select no_plan();
create function pg_temp.refresh_batch() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_array(jsonb_build_object('mealId','a1010000-0000-4000-8000-000000000010','recipeId','a1010000-0000-4000-8000-000000000011','recipeSource','household','recipeVersion',(select updated_at from cooksmith.household_recipes where id='a1010000-0000-4000-8000-000000000011'),
'expected',(select jsonb_agg(to_jsonb(c)) from (select id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities from cooksmith.shopping_item_contributions where planned_meal_id='a1010000-0000-4000-8000-000000000010') c),
'inputs','[{"name":"brown sugar","quantity":55,"unit":"g","category":"pantry","sourceQuantities":[{"name":"brown sugar see note 3","quantity":"55","unit":"g","purchaseName":"brown sugar","legacyPurchaseNames":["brown sugar see note 3"]}]}]'::jsonb));
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into cooksmith.household_recipes(id,household_id,name,ingredients) values('a1010000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000001','Refresh structure','55 g brown sugar see note 3');
insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title,recipe_id) values('a1010000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001','2026-10-05','dinner','Refresh meal','a1010000-0000-4000-8000-000000000011');
select cooksmith.reconcile_planned_meal_shopping('20000000-0000-4000-8000-000000000001','a1010000-0000-4000-8000-000000000010','[{"name":"brown sugar see note 3","quantity":55,"unit":"g","category":"pantry","sourceQuantities":[{"name":"brown sugar see note 3","quantity":"55","unit":"g"}]}]');
update cooksmith.shopping_list_items set completed=true where display_name='brown sugar see note 3';
insert into cooksmith.shopping_list_items(id,household_id,display_name,quantity,unit,category,manual,completed) values('a1010000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000001','Manual household choice',7,'g','pantry',true,true);
select lives_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',pg_temp.refresh_batch())$$,'Explicit refresh can reproject a surviving legacy contribution');
select is((select count(*)::integer from cooksmith.shopping_list_items where display_name='brown sugar'),1,'Clean product replaces old annotated name once');
select ok((select completed from cooksmith.shopping_list_items where display_name='brown sugar'),'Bought state survives identity change');
select is((select count(*)::integer from cooksmith.shopping_list_items where display_name='brown sugar see note 3'),0,'No duplicate stale product remains');
select lives_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',pg_temp.refresh_batch())$$,'Repeat refresh succeeds');
select is((select sum(quantity) from cooksmith.shopping_list_items where display_name='brown sugar'),55::numeric,'Repeat refresh does not duplicate quantity');
select ok((select manual and completed and quantity=7 from cooksmith.shopping_list_items where id='a1010000-0000-4000-8000-000000000012'),'Manual item, amount and completion are unchanged');
-- An explicit override stays linked even when its display name differs from its original source.
select cooksmith.update_shopping_purchase('20000000-0000-4000-8000-000000000001',(select jsonb_build_array(jsonb_build_object('id',id,'name','My chosen sugar','quantity',90,'unit','g','category','pantry')) from cooksmith.shopping_list_items where display_name='brown sugar'));
select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',pg_temp.refresh_batch());
select is((select quantity from cooksmith.shopping_list_items where display_name='My chosen sugar'),90::numeric,'Deliberate purchase adjustment survives refresh');
select is((select count(*)::integer from cooksmith.shopping_list_items where display_name='brown sugar'),0,'Refreshing an override does not reintroduce its planned purchase');
select ok((select completed from cooksmith.shopping_list_items where display_name='My chosen sugar'),'Override bought state survives');
select throws_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',jsonb_set(pg_temp.refresh_batch(),'{0,expected}','[]'))$$,'40001','Shopping contributions changed.','Stale/deleted contribution snapshot is rejected atomically');
select throws_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',jsonb_set(pg_temp.refresh_batch(),'{0,recipeVersion}','"2000-01-01T00:00:00Z"'))$$,'40001','Recipe changed.','Stale recipe version is rejected');
select throws_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',jsonb_set(pg_temp.refresh_batch(),'{0,recipeSource}','"imported"'))$$,'40001','Meal changed.','Source-kind substitution is rejected');
select is((select quantity from cooksmith.shopping_list_items where display_name='My chosen sugar'),90::numeric,'Rejected refreshes leave the override unchanged');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select throws_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001','[]')$$,'42501',null,'Unrelated household cannot refresh');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001',pg_temp.refresh_batch())$$,'Active member can refresh');
reset role;
update cooksmith.household_members set status='inactive',inactive_at=now() where household_id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select cooksmith.refresh_shopping_ingredient_structure('20000000-0000-4000-8000-000000000001','[]')$$,'42501',null,'Inactive member cannot refresh');
reset role;
select * from finish();
rollback;
