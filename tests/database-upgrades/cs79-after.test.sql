begin;
select no_plan();
select results_eq($$select quantity,completed from cooksmith.shopping_list_items where not manual and ingredient_identity='onion'$$,$$values (4::numeric,true)$$,'Upgrade combines legacy aliases and retains all-bought state');
select results_eq($$select quantity,unit from cooksmith.shopping_list_items where not manual and ingredient_identity='carrot' order by unit$$,$$values (1::numeric,'cup'::text),(500::numeric,'g'::text)$$,'Upgrade splits legacy incompatible units and converts metric');
select is((select count(*)::integer from cooksmith.shopping_list_items where id='90000000-0000-4000-8000-000000000084' and manual and completed),1,'Manual row identity and state preserved');
select is((select sum(jsonb_array_length(source_quantities))::integer from cooksmith.shopping_item_contributions),5,'All original contribution amounts preserved');
select is((select count(*)::integer from cooksmith.household_pantry_items where name in('purple onions','sliced purple onions')),2,'Existing Pantry aliases both retained');
select * from finish();
rollback;
