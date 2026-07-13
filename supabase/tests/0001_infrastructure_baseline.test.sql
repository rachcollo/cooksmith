begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

select has_schema('cooksmith', 'Cooksmith v2 schema exists');

select has_table(
  'cooksmith',
  'infrastructure_health',
  'Infrastructure health marker exists'
);

select col_is_pk(
  'cooksmith',
  'infrastructure_health',
  'key',
  'Infrastructure health marker has a stable key'
);

select results_eq(
  $$select value from cooksmith.infrastructure_health where key = 'milestone_3_baseline'$$,
  array['ready'::text],
  'Synthetic seed proves reset and seed execution'
);

select * from finish();

rollback;
