begin;
select plan(5);

insert into cooksmith.households (id, name)
values ('10000000-0000-0000-0000-000000000025', 'Partial plan repair test');
insert into cooksmith.household_recipes (id, household_id, name, servings)
values ('20000000-0000-0000-0000-000000000025',
  '10000000-0000-0000-0000-000000000025', 'Recipe with useful enrichment', 4);
insert into cooksmith.recipe_content_versions
  (id, source_kind, recipe_id, household_id, fingerprint, source_snapshot)
values ('30000000-0000-0000-0000-000000000025', 'household',
  '20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000025',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '{"ingredients":[],"steps":[]}'::jsonb);
insert into cooksmith.recipe_enrichment_jobs
  (id, source_kind, recipe_id, household_id, recipe_version_id, state,
   schema_version, rules_version, model_key, attempt_count, leased_until)
values
  ('40000000-0000-0000-0000-000000000025', 'household',
   '20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000025',
   '30000000-0000-0000-0000-000000000025', 'completed',
   'recipe-intelligence-v3', 'cooksmith-rules-v3', 'provider-assisted-v2', 1, null),
  ('50000000-0000-0000-0000-000000000025', 'household',
   '20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000025',
   '30000000-0000-0000-0000-000000000025', 'processing',
   'recipe-intelligence-v3', 'cooksmith-rules-v3', 'deterministic', 1,
   now() + interval '2 minutes');
insert into cooksmith.recipe_enrichments
  (source_kind, recipe_id, household_id, recipe_version_id, job_id, schema_version,
   rules_version, provider, model_key, result, overall_confidence, is_active, activated_at)
values ('household', '20000000-0000-0000-0000-000000000025',
  '10000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000025',
  '40000000-0000-0000-0000-000000000025', 'recipe-intelligence-v3',
  'cooksmith-rules-v3', 'openai', 'test-model',
  '{"preparationOpportunities":[{"opportunityId":"useful"}]}'::jsonb, 'high', true, now());

select lives_ok(
  $$select cooksmith.activate_recipe_enrichment(
    '50000000-0000-0000-0000-000000000025', 'deterministic', 'deterministic',
    '{"preparationOpportunities":[]}'::jsonb, 'low')$$,
  'empty deterministic result does not replace useful enrichment');
select is((select count(*)::integer from cooksmith.recipe_enrichments where is_active
  and recipe_version_id = '30000000-0000-0000-0000-000000000025'), 1,
  'exactly one enrichment remains active');
select is((select provider from cooksmith.recipe_enrichments where is_active
  and recipe_version_id = '30000000-0000-0000-0000-000000000025'), 'openai',
  'the useful provider enrichment remains active');
select is((select state::text from cooksmith.recipe_enrichment_jobs
  where id = '50000000-0000-0000-0000-000000000025'), 'completed',
  'the deterministic job completes cleanly');
select is((select count(*)::integer from cooksmith.recipe_enrichments
  where job_id = '50000000-0000-0000-0000-000000000025'), 0,
  'the empty result is not persisted');

select * from finish();
rollback;
