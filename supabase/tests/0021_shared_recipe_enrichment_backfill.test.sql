begin;
select no_plan();

select has_enum('cooksmith', 'recipe_enrichment_source', 'Source identity is database constrained');
select has_column(
  'cooksmith',
  'recipe_content_versions',
  'imported_recipe_id',
  'Recipe content versions can identify a shared recipe'
);
select has_column(
  'cooksmith',
  'recipe_enrichment_jobs',
  'imported_recipe_id',
  'Recipe enrichment jobs can identify a shared recipe'
);
select has_column(
  'cooksmith',
  'recipe_enrichments',
  'imported_recipe_id',
  'Recipe enrichment results can identify a shared recipe'
);
select has_table(
  'cooksmith',
  'recipe_enrichment_backfill_audit',
  'Recipe enrichment backfill commands are audited'
);

insert into cooksmith.imported_recipes (
  id, visibility, owner_id, name, source_url, ingredient_rows, instruction_steps
) values (
  '94000000-0000-4000-8000-000000000001', 'public',
  '10000000-0000-4000-8000-000000000001', 'Synthetic shared curry',
  'https://example.invalid/synthetic-shared-curry',
  '[{"id":"ingredient-1","name":"onion","originalText":"1 onion","quantityText":"1"}]',
  '[{"id":"step-1","instruction":"Dice the onion."}]'
);

select results_eq(
  $$select source_kind::text from cooksmith.recipe_enrichment_jobs
    where imported_recipe_id = '94000000-0000-4000-8000-000000000001'$$,
  array['shared_platform'],
  'Publishing a public shared recipe queues source-safe enrichment'
);

update cooksmith.imported_recipes set visibility = 'private'
where id = '94000000-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::integer from cooksmith.recipe_enrichment_jobs
    where imported_recipe_id = '94000000-0000-4000-8000-000000000001'$$,
  array[1],
  'Private imports never create shared enrichment work'
);

select throws_ok(
  $$insert into cooksmith.recipe_content_versions (
      source_kind, recipe_id, imported_recipe_id, household_id, fingerprint, source_snapshot
    ) values (
      'shared_platform', gen_random_uuid(), '94000000-0000-4000-8000-000000000001',
      null, md5('invalid'), '{}'::jsonb
    )$$,
  '23514',
  null,
  'A source version cannot reference both recipe tables'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('94000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cs93-admin@test.invalid', '', now(), now()),
  ('94000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cs93-member@test.invalid', '', now(), now());
insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('94000000-0000-4000-8000-000000000010', 'admin', null);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000011","role":"authenticated"}',
  true
);
select throws_ok(
  $$select cooksmith.recipe_enrichment_backfill_status()$$,
  '42501',
  null,
  'Ordinary household users cannot inspect operational aggregates'
);
select throws_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('start', 25)$$,
  '42501',
  null,
  'Ordinary household users cannot start backfill'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000010","role":"authenticated"}',
  true
);
select lives_ok(
  $$select cooksmith.recipe_enrichment_backfill_status()$$,
  'Application admins can preview source-separated eligibility'
);
select is(
  (
    cooksmith.recipe_enrichment_backfill_command('pause', 25)
    -> 'status'
    ->> 'paused'
  )::boolean,
  true,
  'Pause is persisted server-side'
);
select lives_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('resume', 25)$$,
  'Application admins can safely resume work'
);
reset role;
select is(
  (select count(*)::integer from cooksmith.recipe_enrichment_backfill_audit),
  2,
  'Backfill commands create attributable audit evidence'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000010","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
    values ('94000000-0000-4000-8000-000000000010', 'start')$$,
  '42501',
  null,
  'Application admins cannot forge audit evidence'
);
reset role;

select * from finish();
rollback;
