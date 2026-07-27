begin;
select no_plan();

select has_table('cooksmith', 'recipe_content_versions', 'Recipe content versions exist');
select has_table('cooksmith', 'recipe_enrichment_jobs', 'Recipe enrichment jobs exist');
select has_table('cooksmith', 'recipe_enrichments', 'Recipe enrichments exist');
select has_table('cooksmith', 'recipe_intelligence_settings', 'Recipe Intelligence settings exist');
select ok(
  (select relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'cooksmith' and relname = 'recipe_content_versions'),
  'Content versions use RLS'
);
select ok(
  (select relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'cooksmith' and relname = 'recipe_enrichment_jobs'),
  'Jobs use RLS'
);
select ok(
  (select relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'cooksmith' and relname = 'recipe_enrichments'),
  'Enrichments use RLS'
);

insert into cooksmith.household_recipes (household_id, name)
values ('20000000-0000-4000-8000-000000000001', 'Synthetic intelligence soup');

insert into cooksmith.recipe_ingredients (
  recipe_id, ingredient_name, quantity_text, unit, preparation, position, original_line_text
)
values (
  (select id from cooksmith.household_recipes where name = 'Synthetic intelligence soup'),
  'brown onion', '1', 'kg', 'finely diced', 1, '1 kg brown onion, finely diced'
);

insert into cooksmith.recipe_steps (recipe_id, instruction, position, original_line_text)
values (
  (select id from cooksmith.household_recipes where name = 'Synthetic intelligence soup'),
  'Finely dice the onion.', 1, 'Finely dice the onion.'
);

select results_eq(
  $$select count(*)::integer from cooksmith.recipe_enrichment_jobs where recipe_id = (
    select id from cooksmith.household_recipes where name = 'Synthetic intelligence soup'
  )$$,
  array[3],
  'Recipe and structured-content saves enqueue version-aware work without blocking the save'
);

select results_eq(
  $$select count(*)::integer from cooksmith.recipe_enrichment_jobs where recipe_version_id = (
    select id from cooksmith.recipe_content_versions
    where recipe_id = (select id from cooksmith.household_recipes where name = 'Synthetic intelligence soup')
    order by created_at desc limit 1
  )$$,
  array[1],
  'The same content identity cannot create duplicate processing jobs'
);

select throws_ok(
  $$insert into cooksmith.recipe_enrichments (
    recipe_id, household_id, recipe_version_id, job_id, schema_version, rules_version,
    provider, model_key, result, overall_confidence, is_active
  )
  select recipe_id, household_id, recipe_version_id, id, schema_version, rules_version,
    'deterministic', 'deterministic', '{}'::jsonb, 'unsupported', false
  from cooksmith.recipe_enrichment_jobs limit 1$$,
  '23514',
  null,
  'Unsupported confidence values are rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) > 0 from cooksmith.recipe_content_versions
   where household_id = '20000000-0000-4000-8000-000000000001'),
  true,
  'An active household member can read recipe version provenance'
);
select throws_ok(
  $$insert into cooksmith.recipe_enrichment_jobs (
    recipe_id, household_id, recipe_version_id
  ) select recipe_id, household_id, id from cooksmith.recipe_content_versions limit 1$$,
  '42501',
  null,
  'A browser-authenticated user cannot create worker jobs directly'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq(
  $$select count(*)::integer from cooksmith.recipe_content_versions
    where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0],
  'An unrelated user cannot read recipe version provenance'
);
select results_eq(
  $$select count(*)::integer from cooksmith.recipe_enrichments
    where household_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0],
  'An unrelated user cannot read active intelligence'
);
reset role;

select * from finish();
rollback;
