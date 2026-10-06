begin;
select no_plan();
insert into cooksmith.imported_recipes(id,owner_id,visibility,name,source_url) values
('a1020000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','public','Public lock fixture','https://example.invalid/public-lock'),
('a1020000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','private','Private lock fixture','https://example.invalid/private-lock');
insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title,imported_recipe_id) values
('a1020000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','2026-10-06','dinner','Public meal','a1020000-0000-4000-8000-000000000001'),
('a1020000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','2026-10-07','dinner','Private meal','a1020000-0000-4000-8000-000000000002');
select ok(not has_function_privilege('anon','cooksmith_private.lock_shopping_imported_recipe_version(uuid,uuid,uuid)','EXECUTE'),'Anonymous cannot invoke lock helper');
select ok(not (select prosecdef from pg_proc where oid='cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)'::regprocedure),'Public refresh remains invoker');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from cooksmith.imported_recipes where id='a1020000-0000-4000-8000-000000000001'),1,'Member can read public recipe');
select is((with locked as (select id from cooksmith.imported_recipes where id='a1020000-0000-4000-8000-000000000001' for share) select count(*)::integer from locked),0,'Public recipe write policy stays restricted');
select is(cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001'),(select updated_at from cooksmith.imported_recipes where id='a1020000-0000-4000-8000-000000000001'),'Member gets exact current public version');
select is(cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000004','a1020000-0000-4000-8000-000000000002'),null::timestamptz,'Member cannot lock another user private recipe');
select throws_ok($$select cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000002','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001')$$,'42501',null,'Cross-household substitution denied');
select throws_ok($$select cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000004','a1020000-0000-4000-8000-000000000001')$$,'PT409','Meal changed.','Unlinked recipe substitution denied');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000004','a1020000-0000-4000-8000-000000000002'),(select updated_at from cooksmith.imported_recipes where id='a1020000-0000-4000-8000-000000000002'),'Private owner gets current version');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select throws_ok($$select cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001')$$,'42501',null,'Unrelated caller denied');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select throws_ok($$select cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001')$$,'42501',null,'Inactive caller denied');
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001')$$,'42501',null,'Missing JWT denied');
reset role;
update cooksmith.imported_recipes set visibility='private' where id='a1020000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is(cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000003','a1020000-0000-4000-8000-000000000001'),null::timestamptz,'Unpublished recipe no longer visible to member');
reset role;
update cooksmith.imported_recipes set archived_at=now() where id='a1020000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(cooksmith_private.lock_shopping_imported_recipe_version('20000000-0000-4000-8000-000000000001','a1020000-0000-4000-8000-000000000004','a1020000-0000-4000-8000-000000000002'),null::timestamptz,'Archived recipe unavailable even to owner');
select * from finish();
rollback;
