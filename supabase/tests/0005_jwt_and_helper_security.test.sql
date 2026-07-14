begin;

select no_plan();

select results_eq(
  $$select count(*)::integer from pg_catalog.pg_proc
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'cooksmith'
      and pg_proc.proname in ('is_active_household_member', 'has_household_role', 'has_application_role')
      and pg_proc.prosecdef and pg_proc.provolatile = 's'
      and coalesce(pg_proc.proconfig, array[]::text[]) @> array['search_path=']$$,
  array[3], 'Every authorisation helper is stable, security definer, and has an empty search path'
);
select ok(
  not has_function_privilege('public', 'cooksmith.is_active_household_member(uuid)', 'execute')
  and not has_function_privilege('anon', 'cooksmith.is_active_household_member(uuid)', 'execute')
  and has_function_privilege('authenticated', 'cooksmith.is_active_household_member(uuid)', 'execute'),
  'Helper execution is restricted to authenticated callers'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select ok(not cooksmith.is_active_household_member('20000000-0000-4000-8000-000000000001'),
  'Missing JWT subject fails closed in membership helper');
select ok(not cooksmith.has_household_role('20000000-0000-4000-8000-000000000001', 'owner'),
  'Missing JWT subject fails closed in household-role helper');
select ok(not cooksmith.has_application_role('admin'),
  'Missing JWT subject fails closed in application-role helper');
select results_eq($$select count(*)::integer from cooksmith.households$$, array[0],
  'Missing JWT subject cannot read tenant rows');

select set_config('request.jwt.claim.sub', 'not-a-uuid', true);
select throws_ok($$select auth.uid()$$, '22P02', null, 'Malformed JWT subject is rejected');
select throws_ok($$select cooksmith.is_active_household_member('20000000-0000-4000-8000-000000000001')$$,
  '22P02', null, 'Malformed JWT subject cannot bypass a helper');

-- Claims may be stale or attacker-controlled; live membership rows remain authoritative.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000005","household_role":"owner","app_role":"admin"}',
  true
);
select ok(not cooksmith.is_active_household_member('20000000-0000-4000-8000-000000000001'),
  'Inactive membership overrides stale active claims');
select ok(not cooksmith.has_household_role('20000000-0000-4000-8000-000000000001', 'owner'),
  'Inactive member cannot obtain an owner role from claims');
select ok(not cooksmith.has_application_role('admin'),
  'Unstored application-role claim is ignored');
select results_eq($$select count(*)::integer from cooksmith.households$$, array[0],
  'Inactive member cannot read household rows');
select results_eq($$update cooksmith.household_settings set default_servings = 8 returning household_id$$,
  array[]::uuid[], 'Inactive member cannot mutate household rows');

reset role;
insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('10000000-0000-4000-8000-000000000004', 'admin', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select ok(cooksmith.has_application_role('admin'), 'Live application role is resolved');
select ok(not cooksmith.is_active_household_member('20000000-0000-4000-8000-000000000001'),
  'Application role does not imply household membership');
select ok(not cooksmith.has_household_role('20000000-0000-4000-8000-000000000001', 'owner'),
  'Application role does not imply household ownership');
select results_eq($$select count(*)::integer from cooksmith.households$$, array[0],
  'Application admin remains tenant isolated');

reset role;
select * from finish();
rollback;
