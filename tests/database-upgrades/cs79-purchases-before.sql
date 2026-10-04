insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title) values('80000000-0000-4000-8000-000000000079','20000000-0000-4000-8000-000000000001','2026-10-04','dinner','Legacy purchase upgrade');
insert into cooksmith.shopping_list_items(id,household_id,display_name,unit,manual,completed) values
('90000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000001','extra virgin olive oil','ml',false,true),
('90000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000001','extra virgin olive oil','tsp',false,true),
('90000000-0000-4000-8000-000000000073','20000000-0000-4000-8000-000000000001','review flour','g',false,true);
insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities) values
('20000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000071','80000000-0000-4000-8000-000000000079',60,'ml','[{"name":"extra virgin olive oil","quantity":60,"unit":"ml"}]'),
('20000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000072','80000000-0000-4000-8000-000000000079',2,'tsp','[{"name":"extra virgin olive oil","quantity":2,"unit":"tsp"}]'),
('20000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000073','80000000-0000-4000-8000-000000000079',100,'g','[{"name":"review flour","quantity":100,"unit":"g"}]');
update cooksmith.shopping_list_items set manual=true,quantity=150 where id='90000000-0000-4000-8000-000000000073';
