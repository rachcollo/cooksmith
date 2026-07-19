begin;
select no_plan();

select has_table('cooksmith', 'imported_recipes', 'Imported recipe store exists');
select has_column('cooksmith', 'imported_recipes', 'author_name', 'Author attribution is stored separately');
select has_column('cooksmith', 'imported_recipes', 'ingredient_rows', 'Derived ingredient structure is stored');
select has_column('cooksmith', 'imported_recipes', 'instruction_steps', 'Derived instruction structure is stored');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into cooksmith.imported_recipes (visibility, name, source_url, author_name) values ('public', 'Shared pasta', 'https://example.invalid/shared-pasta', 'A Cook')$$,
  'Authenticated user can publish an attributed recipe'
);
select lives_ok(
  $$insert into cooksmith.imported_recipes (visibility, name, source_url) values ('private', 'Private soup', 'https://example.invalid/private-soup')$$,
  'Authenticated user can save a private import'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$select name from cooksmith.imported_recipes order by name$$,
  $$values ('Shared pasta'::text)$$,
  'Another authenticated user sees public imports but not private imports'
);
select results_eq(
  $$update cooksmith.imported_recipes set name = 'Changed globally' where name = 'Shared pasta' returning id$$,
  array[]::uuid[],
  'Another user cannot mutate a public canonical recipe'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$update cooksmith.imported_recipes set name = 'Private soup updated' where name = 'Private soup' returning name$$,
  $$values ('Private soup updated'::text)$$,
  'Private import owner can update their recipe'
);
select results_eq(
  $$update cooksmith.imported_recipes set name = 'Publisher edit' where name = 'Shared pasta' returning id$$,
  array[]::uuid[],
  'Publisher cannot directly mutate a public canonical recipe'
);
select throws_ok(
  $$insert into cooksmith.imported_recipes (visibility, name, source_url) values ('public', 'Duplicate', 'https://example.invalid/shared-pasta')$$,
  '23505', null, 'Duplicate public canonical source URLs are rejected'
);
reset role;

select * from finish();
rollback;
