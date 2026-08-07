begin;
select no_plan();

select has_function(
  'cooksmith_private', 'reconcile_active_recipe_enrichment_jobs', array[]::text[],
  'Contradictory active-enrichment jobs have a narrow reconciliation boundary'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('96000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'recovery-admin@test.invalid', '', now(), now()),
  ('96000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'recovery-member@test.invalid', '', now(), now());
insert into cooksmith.app_user_roles(user_id, role)
values ('96000000-0000-4000-8000-000000000001', 'admin');

insert into cooksmith.imported_recipes (
  id, visibility, owner_id, name, source_url, ingredient_rows, instruction_steps
) values
  ('96000000-0000-4000-8000-000000000010', 'public',
   '10000000-0000-4000-8000-000000000001', 'Atomic recipe',
   'https://example.invalid/atomic', '[]', '[]'),
  ('96000000-0000-4000-8000-000000000011', 'public',
   '10000000-0000-4000-8000-000000000001', 'Recoverable recipe',
   'https://example.invalid/recoverable', '[]', '[]'),
  ('96000000-0000-4000-8000-000000000012', 'public',
   '10000000-0000-4000-8000-000000000001', 'Old-version recipe',
   'https://example.invalid/old-version', '[]', '[]');

insert into cooksmith.recipe_enrichment_jobs (
  source_kind, imported_recipe_id, recipe_version_id, schema_version, rules_version,
  model_key, state, attempt_count
)
select 'shared_platform', versions.imported_recipe_id, versions.id,
       case when versions.imported_recipe_id = '96000000-0000-4000-8000-000000000011'
         then 'recipe-intelligence-v3' else 'recipe-intelligence-v1' end,
       case when versions.imported_recipe_id = '96000000-0000-4000-8000-000000000011'
         then 'cooksmith-rules-v3' else 'cooksmith-rules-v1' end,
       'provider-assisted-v1',
       case when versions.imported_recipe_id = '96000000-0000-4000-8000-000000000010'
         then 'processing'::cooksmith.recipe_enrichment_job_state
         else 'failed'::cooksmith.recipe_enrichment_job_state end,
       case when versions.imported_recipe_id = '96000000-0000-4000-8000-000000000010' then 1 else 3 end
from cooksmith.recipe_content_versions versions
where versions.imported_recipe_id in (
  '96000000-0000-4000-8000-000000000010',
  '96000000-0000-4000-8000-000000000011',
  '96000000-0000-4000-8000-000000000012'
)
on conflict (recipe_version_id, schema_version, rules_version, model_key) do update
set state = excluded.state, attempt_count = excluded.attempt_count;

select lives_ok(
  $$select cooksmith.activate_recipe_enrichment(
    (select id from cooksmith.recipe_enrichment_jobs
     where imported_recipe_id = '96000000-0000-4000-8000-000000000010'
       and model_key = 'provider-assisted-v1'),
    'openai', 'gpt-test',
    '{"recipeId":"atomic","ingredients":[],"unresolvedIngredientIds":[],"overallConfidence":"high"}',
    'high'
  )$$,
  'Activation and completion commit through one database function'
);
select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000010'
     and model_key = 'provider-assisted-v1'),
  'completed',
  'Atomic activation completes the job'
);
select ok(
  (select is_active from cooksmith.recipe_enrichments
   where imported_recipe_id = '96000000-0000-4000-8000-000000000010'),
  'Atomic activation leaves one active enrichment'
);

update cooksmith.recipe_enrichment_jobs
set state = 'failed', failure_category = 'internal_validation'
where imported_recipe_id = '96000000-0000-4000-8000-000000000010'
  and model_key = 'provider-assisted-v1';
set local role service_role;
select is(
  cooksmith_private.reconcile_active_recipe_enrichment_jobs(), 1,
  'Reconciliation repairs the active-enrichment/failed-job contradiction'
);
reset role;
select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000010'
     and model_key = 'provider-assisted-v1'),
  'completed',
  'Reconciliation preserves the successful enrichment as completed'
);

-- Make recipe 12's provider failure obsolete by creating a newer content version.
-- now() is transaction-stable, so age the fixture explicitly before the update trigger runs.
update cooksmith.recipe_content_versions
set created_at = created_at - interval '1 second'
where imported_recipe_id = '96000000-0000-4000-8000-000000000012';

update cooksmith.imported_recipes
set name = 'Old-version recipe revised'
where id = '96000000-0000-4000-8000-000000000012';

-- An active deterministic enrichment must not suppress recovery of an exhausted AI job.
update cooksmith.recipe_enrichment_jobs
set state = 'processing', attempt_count = 1
where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
  and model_key = 'deterministic';

select cooksmith.activate_recipe_enrichment(
  (select id from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
     and model_key = 'deterministic'),
  'deterministic', 'deterministic',
  '{"recipeId":"recoverable","ingredients":[],"unresolvedIngredientIds":[],"overallConfidence":"high"}',
  'high'
);

update cooksmith.recipe_enrichment_jobs
set state = 'failed', attempt_count = 3, failure_category = 'internal_validation'
where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
  and model_key = 'deterministic';

update cooksmith.recipe_enrichment_jobs
set failure_category = 'internal_validation'
where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
  and model_key = 'provider-assisted-v1';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000002","role":"authenticated"}', true
);
select throws_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('recover_exhausted_ai_failures', 100)$$,
  '42501', null,
  'Ordinary members cannot recover exhausted AI failures'
);
select throws_ok(
  $$select cooksmith.recipe_enrichment_backfill_status()$$,
  '42501', null,
  'Ordinary members cannot inspect recoverable operational counts'
);
reset role;

update cooksmith.recipe_intelligence_settings set ai_enabled = true where singleton;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}', true
);
select is(
  (cooksmith.recipe_enrichment_backfill_status()->>'recoverableCount')::integer,
  1,
  'Active deterministic enrichment does not suppress the exact recoverable AI count'
);
select lives_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('recover_exhausted_ai_failures', 100)$$,
  'An admin can explicitly recover exhausted AI failures'
);
reset role;

select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
     and model_key = 'provider-assisted-v1'),
  'pending',
  'Recovery resets the exhausted provider job for the latest version'
);
select is(
  (select attempt_count from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
     and model_key = 'provider-assisted-v1'),
  0,
  'Recovery resets the bounded retry counter deliberately'
);
select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000011'
     and model_key = 'deterministic'),
  'failed',
  'Recovery leaves deterministic failures untouched'
);
select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000012'
     and model_key = 'provider-assisted-v1'
     and recipe_version_id <> (
       select id from cooksmith.recipe_content_versions
       where imported_recipe_id = '96000000-0000-4000-8000-000000000012'
       order by created_at desc, id desc
       limit 1
     )),
  'failed',
  'Recovery leaves old recipe-version failures untouched'
);
select is(
  (select state::text from cooksmith.recipe_enrichment_jobs
   where imported_recipe_id = '96000000-0000-4000-8000-000000000010'
     and model_key = 'provider-assisted-v1'),
  'completed',
  'Recovery leaves recipes with successful active enrichment untouched'
);
select results_eq(
  $$select action from cooksmith.recipe_enrichment_backfill_audit
    where action = 'recover_exhausted_ai_failures'$$,
  array['recover_exhausted_ai_failures'::text],
  'Recovery is explicitly audited'
);

select * from finish();
rollback;
