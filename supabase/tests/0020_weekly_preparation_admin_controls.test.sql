begin;
select plan(15);

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
  'Accepted 30-plan evaluation required',
  'AI cannot be enabled before the hosted evaluation is accepted'
);

reset role;
insert into cooksmith.weekly_preparation_evaluation_runs (
  corpus_version,
  schema_version,
  planner_version,
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
  ambiguous_decision
) values (
  'synthetic-30-v1',
  'weekly-preparation-plan-v1',
  'weekly-preparation-planner-v1',
  'test-model',
  'test-pricing',
  30,
  20,
  10,
  10,
  10,
  0,
  0,
  0,
  30,
  3000,
  1000,
  500,
  0.100000,
  'accepted'
);
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
