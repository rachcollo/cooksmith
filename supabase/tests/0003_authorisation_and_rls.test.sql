begin;

select plan(24);

select results_eq(
  $$
    select relname::text
    from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'cooksmith'
      and pg_class.relkind = 'r'
      and not pg_class.relrowsecurity
    order by relname
  $$,
  array[]::text[],
  'RLS is enabled on every Cooksmith table'
);

select has_function(
  'cooksmith',
  'is_active_household_member',
  array['uuid'],
  'Active membership helper exists'
);
select has_function(
  'cooksmith',
  'has_household_role',
  array['uuid', 'cooksmith.household_role'],
  'Household role helper exists'
);
select has_function(
  'cooksmith',
  'has_application_role',
  array['cooksmith.application_role'],
  'Application role helper exists'
);

select results_eq(
  $$
    select count(*)::integer
    from pg_catalog.pg_proc
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'cooksmith'
      and pg_proc.proname in (
        'is_active_household_member',
        'has_household_role',
        'has_application_role'
      )
      and pg_proc.prosecdef
      and exists (
        select 1
        from unnest(pg_proc.proconfig) as setting
        where setting like 'search_path=%'
          and replace(setting, 'search_path=', '') in ('', '""')
      )
  $$,
  array[3],
  'Authorisation helpers are security definer functions with an empty search path'
);

select ok(
  not has_function_privilege('anon', 'cooksmith.is_active_household_member(uuid)', 'execute')
  and has_function_privilege(
    'authenticated',
    'cooksmith.is_active_household_member(uuid)',
    'execute'
  ),
  'Only authenticated browser users can execute the membership helper'
);

select ok(
  not has_schema_privilege('anon', 'cooksmith', 'usage')
  and has_schema_privilege('authenticated', 'cooksmith', 'usage'),
  'Anonymous access remains denied while authenticated access can reach RLS-protected objects'
);

select ok(
  not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'select')
  and not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'insert')
  and not has_table_privilege('authenticated', 'cooksmith.infrastructure_health', 'select'),
  'Application roles and infrastructure records remain default deny'
);

select results_eq(
  $$
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'cooksmith'
      and tablename in ('app_user_roles', 'infrastructure_health')
  $$,
  array[0],
  'Default-deny tables have no browser policies'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select results_eq(
  $$select count(*)::integer from cooksmith.profiles$$,
  array[1],
  'Owner A can read only their own profile'
);
select results_eq(
  $$select name from cooksmith.households order by name$$,
  array['Household A'::text],
  'Owner A can read only Household A'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_members$$,
  array[2],
  'Owner A can read active members of Household A only'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_settings$$,
  array[1],
  'Owner A can read only Household A settings'
);
select results_eq(
  $$
    update cooksmith.household_settings
    set default_servings = 5,
        updated_by = '10000000-0000-4000-8000-000000000001'
    where household_id = '20000000-0000-4000-8000-000000000001'
    returning default_servings::integer
  $$,
  array[5],
  'Owner A can update Household A settings'
);
select results_eq(
  $$
    update cooksmith.household_settings
    set default_servings = 5
    where household_id = '20000000-0000-4000-8000-000000000002'
    returning default_servings::integer
  $$,
  array[]::integer[],
  'Owner A cannot update Household B settings'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select name from cooksmith.households order by name$$,
  array['Household A'::text],
  'Member A can read their active household only'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_allergies$$,
  array[1],
  'Member A can read safety constraints for Household A'
);
select results_eq(
  $$
    update cooksmith.household_settings
    set default_servings = 6
    where household_id = '20000000-0000-4000-8000-000000000001'
    returning default_servings::integer
  $$,
  array[]::integer[],
  'Member A cannot change owner-managed settings'
);
select results_eq(
  $$
    update cooksmith.household_members
    set role = 'owner'
    where user_id = '10000000-0000-4000-8000-000000000002'
    returning 1
  $$,
  array[]::integer[],
  'Member A cannot promote themselves to owner'
);

reset role;
insert into cooksmith.app_user_roles (user_id, role, granted_by)
values (
  '10000000-0000-4000-8000-000000000002',
  'admin',
  '10000000-0000-4000-8000-000000000003'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select ok(
  cooksmith.has_application_role('admin'),
  'Application role helper resolves an independently granted global role'
);
select results_eq(
  $$select name from cooksmith.households order by name$$,
  array['Household A'::text],
  'A global application role does not grant cross-household access'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select results_eq(
  $$select count(*)::integer from cooksmith.households$$,
  array[0],
  'Unrelated user cannot read any household'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_dietary_requirements$$,
  array[0],
  'Unrelated user cannot read household dietary requirements'
);
select results_eq(
  $$
    update cooksmith.household_members
    set role = 'owner'
    where user_id = '10000000-0000-4000-8000-000000000004'
    returning 1
  $$,
  array[]::integer[],
  'Unrelated user cannot create access by changing membership rows'
);

reset role;

select * from finish();

rollback;
