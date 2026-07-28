begin;
select plan(12);

select has_table('cooksmith', 'feature_flags', 'Feature flags table exists');
select has_table('cooksmith', 'feature_flag_audit', 'Feature flag audit table exists');
select is(
  (select enabled from cooksmith.feature_flags where key = 'planner_apply_confirmation'),
  false,
  'Planner confirmation defaults off'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'cooksmith.feature_flags'::regclass),
  'Feature flags have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'cooksmith.feature_flag_audit'::regclass),
  'Feature flag audit has RLS enabled'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('92000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.invalid', '', now(), now()),
  ('92000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.invalid', '', now(), now());

insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('92000000-0000-4000-8000-000000000001', 'admin', null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$select key from cooksmith.feature_flags$$,
  'Signed-in users can read effective flags'
);
select is_empty(
  $$update cooksmith.feature_flags
      set enabled = true
      where key = 'planner_apply_confirmation'
      returning key$$,
  'Non-admin users cannot update flags'
);
select is_empty(
  $$select * from cooksmith.feature_flag_audit$$,
  'Non-admin users cannot read audit evidence'
);

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$update cooksmith.feature_flags set enabled = true where key = 'planner_apply_confirmation'$$,
  'Application admins can update flags'
);
select is(
  (select enabled from cooksmith.feature_flags where key = 'planner_apply_confirmation'),
  true,
  'Admin changes persist'
);
select results_eq(
  $$select previous_enabled, enabled, changed_by
    from cooksmith.feature_flag_audit
    where flag_key = 'planner_apply_confirmation'$$,
  $$values (false, true, '92000000-0000-4000-8000-000000000001'::uuid)$$,
  'Flag changes create attributable audit evidence'
);
select throws_ok(
  $$insert into cooksmith.feature_flag_audit
      (flag_key, previous_enabled, enabled, changed_by)
    values ('planner_apply_confirmation', true, false, '92000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'Admins cannot forge audit records'
);

select * from finish();
rollback;
