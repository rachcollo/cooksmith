begin;
select plan(17);

select has_table(
  'cooksmith',
  'weekly_preparation_settings_audit',
  'Weekly preparation settings audit table exists'
);
select has_table(
  'cooksmith',
  'weekly_preparation_evaluation_runs',
  'Weekly preparation evaluation evidence table exists'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    where oid = 'cooksmith.weekly_preparation_settings_audit'::regclass),
  'Settings audit has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    where oid = 'cooksmith.weekly_preparation_evaluation_runs'::regclass),
  'Evaluation evidence has RLS enabled'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('93000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.invalid', '', now(), now()),
  ('93000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.invalid', '', now(), now());

insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('93000000-0000-4000-8000-000000000001', 'admin', null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is_empty(
  $$select * from cooksmith.weekly_preparation_settings$$,
  'Household users cannot read weekly preparation settings'
);
select is_empty(
  $$update cooksmith.weekly_preparation_settings
      set ai_enabled = true
    where singleton
    returning singleton$$,
  'Household users cannot change AI assistance'
);
select is_empty(
  $$select * from cooksmith.weekly_preparation_settings_audit$$,
  'Household users cannot read control audit evidence'
);
select is_empty(
  $$select * from cooksmith.weekly_preparation_evaluation_runs$$,
  'Household users cannot read evaluation evidence'
);

select set_config('request.jwt.claims', '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$update cooksmith.weekly_preparation_settings
      set ai_enabled = true, emergency_stop = false
    where singleton$$,
  '23514',
  'Current smoke test and accepted 30-plan evaluation required',
  'AI cannot be enabled before the hosted evaluation is accepted'
);

reset role;
insert into cooksmith.weekly_preparation_evaluation_runs (
  corpus_version,
  schema_version,
  planner_version,
  prompt_version,
  model_identifier,
  pricing_version,
  plan_count,
  deterministic_count,
  model_call_count,
  valid_output_count,
  accepted_count,
  rejected_count,
  fallback_count,
  unsupported_count,
  reviewed_correct_count,
  total_latency_ms,
  input_tokens,
  output_tokens,
  estimated_cost_aud,
  ambiguous_decision,
  completed_at,
  deployment_sha
) values (
  'weekly-preparation-corpus-v6',
  'weekly-preparation-plan-v2',
  'weekly-preparation-planner-v6',
  'weekly-preparation-strategy-v6',
  'test-model',
  'test-pricing',
  30,
  0,
  30,
  30,
  30,
  0,
  0,
  0,
  30,
  3000,
  1000,
  500,
  0.100000,
  'accepted',
  now(),
  repeat('a', 40)
);
insert into cooksmith.weekly_preparation_evaluation_cases (
  run_id, case_number, case_key, expected_model_call, model_called, outcome,
  latency_ms, input_tokens, output_tokens, estimated_cost_aud
)
select
  run.id,
  case_number,
  'legacy-case-' || case_number,
  true,
  true,
  'model-assisted',
  100,
  100,
  50,
  0
from cooksmith.weekly_preparation_evaluation_runs run
cross join generate_series(1, 30) case_number;

update cooksmith.weekly_preparation_settings
set
  model_identifier = 'test-model',
  smoke_verified_at = now(),
  smoke_deployment_sha = repeat('a', 40)
where singleton;

set local role authenticated;
select lives_ok(
  $$select cooksmith.accept_weekly_preparation_evaluation(
      (select id from cooksmith.weekly_preparation_evaluation_runs limit 1)
    )$$,
  'Application admins can explicitly accept a complete current evaluation'
);
reset role;
update cooksmith.weekly_preparation_settings
set smoke_deployment_sha = repeat('b', 40)
where singleton;
set local role authenticated;
select throws_ok(
  $$update cooksmith.weekly_preparation_settings
      set ai_enabled = true, emergency_stop = false
    where singleton$$,
  '23514',
  'Current smoke test and accepted 30-plan evaluation required',
  'AI cannot activate when smoke and evaluation came from different deployments'
);
reset role;
update cooksmith.weekly_preparation_settings
set smoke_deployment_sha = repeat('a', 40)
where singleton;
set local role authenticated;
select lives_ok(
  $$update cooksmith.weekly_preparation_settings
      set ai_enabled = true, emergency_stop = false
    where singleton$$,
  'Application admins can change weekly preparation controls'
);
select is(
  (select ai_enabled from cooksmith.weekly_preparation_settings where singleton),
  true,
  'Admin AI control changes persist'
);
select results_eq(
  $$select previous_ai_enabled, ai_enabled, changed_by
    from cooksmith.weekly_preparation_settings_audit$$,
  $$values (false, true, '93000000-0000-4000-8000-000000000001'::uuid)$$,
  'Control changes create attributable audit evidence'
);
select throws_ok(
  $$insert into cooksmith.weekly_preparation_settings_audit (
      previous_ai_enabled, ai_enabled, previous_emergency_stop, emergency_stop, changed_by
    ) values (
      true, false, false, false, '93000000-0000-4000-8000-000000000001'
    )$$,
  '42501',
  null,
  'Admins cannot forge control audit evidence'
);
select lives_ok(
  $$select model_identifier from cooksmith.weekly_preparation_settings$$,
  'Admins can read only the safe configured model identifier'
);
select is(
  (select emergency_stop from cooksmith.weekly_preparation_settings where singleton),
  false,
  'Emergency stop remains clear after the audited AI enablement'
);

select * from finish();
rollback;
