begin;
select no_plan();

select has_function(
  'cooksmith',
  'recipe_intelligence_ai_command',
  array['text'],
  'Recipe Intelligence AI has a protected admin control'
);

insert into cooksmith.imported_recipes (
  id, visibility, owner_id, name, source_url, ingredient_rows, instruction_steps
) values (
  '95000000-0000-4000-8000-000000000010', 'public',
  '10000000-0000-4000-8000-000000000001', 'Synthetic AI recipe',
  'https://example.invalid/synthetic-ai-recipe',
  '[{"id":"ingredient-1","name":"onion","originalText":"1 onion","quantityText":"1"}]',
  '[{"id":"step-1","instruction":"Dice the onion."}]'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('95000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'recipe-ai-admin@test.invalid', '', now(), now()),
  ('95000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'recipe-ai-member@test.invalid', '', now(), now());
insert into cooksmith.app_user_roles(user_id, role)
values ('95000000-0000-4000-8000-000000000001', 'admin');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$select cooksmith.recipe_intelligence_ai_command('enable_ai')$$,
  '42501',
  null,
  'Household users cannot enable Recipe Intelligence AI'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (cooksmith.recipe_intelligence_ai_command('enable_ai')->>'aiEnabled')::boolean,
  true,
  'An application admin can enable Recipe Intelligence AI through the authorised control'
);
reset role;

select results_eq(
  $$select action from cooksmith.recipe_enrichment_backfill_audit
    where action = 'enable_ai' order by created_at desc limit 1$$,
  array['enable_ai'::text],
  'Recipe Intelligence AI enablement is audited'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('reprocess_ai', 25)$$,
  'An admin can create versioned provider-assisted reprocessing jobs'
);
reset role;

select ok(
  exists (
    select 1
    from cooksmith.recipe_enrichment_jobs assisted
    join cooksmith.recipe_enrichment_jobs deterministic
      on deterministic.recipe_version_id = assisted.recipe_version_id
     and deterministic.model_key = 'deterministic'
    where assisted.model_key = 'provider-assisted-v1'
  ),
  'AI reprocessing creates a separate job identity beside deterministic evidence'
);

update cooksmith.recipe_enrichment_jobs
set state = 'failed',
    failure_category = 'permanent_provider',
    provider_http_status = 400,
    provider_error_code = 'invalid_request_error',
    provider_error_param = 'text.format.type',
    provider_request_id = 'req_synthetic_diagnostic'
where recipe_version_id in (
  select id from cooksmith.recipe_content_versions
  where imported_recipe_id = '95000000-0000-4000-8000-000000000010'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  cooksmith.recipe_enrichment_backfill_status()
    #>> '{latestProviderFailure,errorCode}',
  'invalid_request_error',
  'An admin can inspect the privacy-safe provider error code'
);
select is(
  cooksmith.recipe_enrichment_backfill_status()
    #>> '{latestProviderFailure,errorParam}',
  'text.format.type',
  'An admin can inspect the rejected provider parameter without request values'
);
select is(
  cooksmith.recipe_enrichment_backfill_status()
    #>> '{latestProviderFailure,requestId}',
  'req_synthetic_diagnostic',
  'An admin can inspect the provider request identifier'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$select cooksmith.recipe_enrichment_backfill_command('retry_failed', 1)$$,
  'An admin can release one provider-assisted canary for retry'
);
reset role;

select is(
  (
    select state::text from cooksmith.recipe_enrichment_jobs
    where recipe_version_id in (
      select id from cooksmith.recipe_content_versions
      where imported_recipe_id = '95000000-0000-4000-8000-000000000010'
    )
    and model_key = 'provider-assisted-v1'
  ),
  'pending',
  'Retry failed releases the provider-assisted job'
);

select is(
  (
    select provider_error_code from cooksmith.recipe_enrichment_jobs
    where recipe_version_id in (
      select id from cooksmith.recipe_content_versions
      where imported_recipe_id = '95000000-0000-4000-8000-000000000010'
    )
    and model_key = 'provider-assisted-v1'
  ),
  null::text,
  'Retry failed clears obsolete provider diagnostics'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  cooksmith.recipe_enrichment_backfill_status()->>'latestProviderFailure',
  null::text,
  'The admin status hides a provider error after its job is released'
);
reset role;

select is(
  (
    select state::text from cooksmith.recipe_enrichment_jobs
    where recipe_version_id in (
      select id from cooksmith.recipe_content_versions
      where imported_recipe_id = '95000000-0000-4000-8000-000000000010'
    )
    and model_key = 'deterministic'
  ),
  'failed',
  'Retry failed leaves deterministic evidence untouched'
);

select * from finish();
rollback;
