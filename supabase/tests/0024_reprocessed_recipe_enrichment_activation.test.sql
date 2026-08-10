begin;
select plan(4);

insert into cooksmith.households (id, name)
values ('10000000-0000-0000-0000-000000000024', 'Activation test');

insert into cooksmith.household_recipes (id, household_id, name, servings)
values ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000024',
  'Reprocessed recipe', 4);

insert into cooksmith.recipe_content_versions
  (id, source_kind, recipe_id, household_id, fingerprint, source_snapshot)
values ('30000000-0000-0000-0000-000000000024', 'household',
  '20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000024',
  'activation-fingerprint', '{"ingredients":[],"steps":[]}'::jsonb);

insert into cooksmith.recipe_enrichment_jobs
  (id, source_kind, recipe_id, household_id, recipe_version_id, state,
   schema_version, rules_version, model_key, attempt_count, leased_until)
values ('40000000-0000-0000-0000-000000000024', 'household',
  '20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000024',
  '30000000-0000-0000-0000-000000000024', 'processing',
  'recipe-intelligence-v3', 'cooksmith-rules-v3', 'provider-assisted-v2', 1,
  now() + interval '2 minutes');

select lives_ok(
  $$select cooksmith.activate_recipe_enrichment(
    '40000000-0000-0000-0000-000000000024', 'openai', 'test-model',
    '{"revision":1}'::jsonb, 'high')$$,
  'first activation succeeds');

update cooksmith.recipe_enrichment_jobs
set state = 'processing', completed_at = null, leased_until = now() + interval '2 minutes'
where id = '40000000-0000-0000-0000-000000000024';

select lives_ok(
  $$select cooksmith.activate_recipe_enrichment(
    '40000000-0000-0000-0000-000000000024', 'openai', 'test-model',
    '{"revision":2}'::jsonb, 'medium')$$,
  'reprocessing the same durable job replaces its enrichment');

select is((select count(*)::integer from cooksmith.recipe_enrichments
  where job_id = '40000000-0000-0000-0000-000000000024'), 1,
  'reprocessing preserves one enrichment row per job');

select is((select result ->> 'revision' from cooksmith.recipe_enrichments
  where job_id = '40000000-0000-0000-0000-000000000024'), '2',
  'the active enrichment contains the corrected result');

select * from finish();
rollback;
