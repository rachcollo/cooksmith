begin;
select no_plan();
insert into cooksmith.household_recipes(id,household_id,name) values
('a0800000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Favourite household'),
('a0800000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Unrelated household');
insert into cooksmith.imported_recipes(id,owner_id,name,ingredients,visibility,source_url) values
('a0800000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Public favourite','2 carrots','public','https://example.invalid/favourite-public'),
('a0800000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Private favourite','2 carrots','private','https://example.invalid/favourite-private');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','household',true),true,'Owner can favourite a household recipe');
select is(cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','household',true),true,'Repeated desired state is idempotent');
select is((select count(*)::integer from cooksmith.household_recipe_favourites where household_recipe_id='a0800000-0000-4000-8000-000000000001'),1,'No duplicate favourite');
select lives_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','imported',true)$$,'Public recipe with same ID has independent identity');
select is((select count(*)::integer from cooksmith.household_recipe_favourites where household_recipe_id='a0800000-0000-4000-8000-000000000001' or imported_recipe_id='a0800000-0000-4000-8000-000000000001'),2,'Source collision does not merge favourites');
select throws_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000003','imported',true)$$,'42501',null,'Owner-private recipe cannot become shared household preference');
select throws_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000002','household',true)$$,'42501',null,'Cannot forge another household recipe');
select throws_ok($$insert into cooksmith.household_recipe_favourites(household_id,household_recipe_id) values('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000002')$$,'42501',null,'Direct insert cannot bypass source policy');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from cooksmith.household_recipe_favourites where household_recipe_id='a0800000-0000-4000-8000-000000000001'),1,'Another active member sees the same choice');
select is(cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','household',false),false,'Member can unfavourite');
select is(cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','household',false),false,'Repeated removal is idempotent');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from cooksmith.household_recipe_favourites),0,'Unrelated member cannot read another household choices');
select throws_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','imported',true)$$,'42501',null,'Unrelated member cannot mutate another household');
reset role;
update cooksmith.imported_recipes set visibility='private' where id='a0800000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from cooksmith.household_recipe_favourites where imported_recipe_id='a0800000-0000-4000-8000-000000000001'),0,'Unpublished recipe is not an actionable favourite');
select throws_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','imported',true)$$,'42501',null,'Unpublished recipe cannot be favourited');
reset role;
update cooksmith.household_members set status='inactive',inactive_at=now() where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select cooksmith.set_household_recipe_favourite('20000000-0000-4000-8000-000000000001','a0800000-0000-4000-8000-000000000001','household',true)$$,'42501',null,'Inactive member cannot toggle');
reset role;
select ok(not has_function_privilege('anon','cooksmith.set_household_recipe_favourite(uuid,uuid,text,boolean)','EXECUTE'),'Anonymous RPC denied');
select ok(not has_table_privilege('anon','cooksmith.household_recipe_favourites','SELECT'),'Anonymous table read denied');
select * from finish();
rollback;
