begin;
select no_plan();

insert into cooksmith.app_user_roles(user_id, role, granted_by)
values ('10000000-0000-4000-8000-000000000003', 'admin', null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into cooksmith.imported_recipes(name,source_url) values ('Default private','https://example.invalid/cs113-default')$$,
  'An omitted visibility saves privately'
);
select is((select visibility::text from cooksmith.imported_recipes where name='Default private'),'private','Database defaults private');
select throws_ok(
  $$insert into cooksmith.imported_recipes(owner_id,name,source_url) values ('10000000-0000-4000-8000-000000000002','Forged owner','https://example.invalid/cs113-forged')$$,
  '42501',null,'Uploader identity cannot be forged'
);
select throws_ok(
  $$update cooksmith.imported_recipes set visibility='public' where name='Default private'$$,
  '42501',null,'Private owner cannot escalate visibility'
);
select throws_ok(
  $$update cooksmith.imported_recipes set owner_id='10000000-0000-4000-8000-000000000002' where name='Default private'$$,
  '42501',null,'Private owner cannot transfer uploader identity'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty($$select id from cooksmith.imported_recipes where name='Default private'$$,'Partial package does not widen existing private reads to household members');
select is_empty($$update cooksmith.imported_recipes set archived_at=now() where name='Default private' returning id$$,'Other household member cannot archive private import');
select throws_ok(
  $$insert into cooksmith.imported_recipes(visibility,name,source_url) values ('public','Member public','https://example.invalid/cs113-member')$$,
  '42501',null,'Household member cannot create public recipe'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty($$select id from cooksmith.imported_recipes where name='Default private'$$,'Application admin receives no new private read authority');
select lives_ok(
  $$insert into cooksmith.imported_recipes(visibility,name,source_url,author_name,publisher_name) values ('public','Admin public','https://example.invalid/cs113-admin','Synthetic author','Synthetic publisher')$$,
  'Application admin retains owned public insertion'
);
select throws_ok(
  $$insert into cooksmith.imported_recipes(visibility,owner_id,name,source_url) values ('public','10000000-0000-4000-8000-000000000001','Admin forged','https://example.invalid/cs113-admin-forged')$$,
  '42501',null,'Admin cannot forge an uploader either'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq($$select author_name,publisher_name from cooksmith.imported_recipes where name='Admin public'$$,$$values ('Synthetic author'::text,'Synthetic publisher'::text)$$,'Public reading and attribution remain intact');
select is_empty($$update cooksmith.imported_recipes set name='Changed public' where name='Admin public' returning id$$,'Ordinary user cannot update public import');
reset role;
set local role anon;
select throws_ok($$select id from cooksmith.imported_recipes$$,'42501',null,'Anonymous table access remains denied as on the accepted baseline');
reset role;
select * from finish();
rollback;
