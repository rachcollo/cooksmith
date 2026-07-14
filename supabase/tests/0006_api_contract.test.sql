begin;

select no_plan();

select results_eq(
  $$select relname::text from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'cooksmith' and pg_class.relkind = 'r'
      and not pg_class.relrowsecurity order by relname$$,
  array[]::text[], 'Every private API table has RLS enabled'
);

select results_eq(
  $$select tablename || ':' || cmd from pg_catalog.pg_policies
    where schemaname = 'cooksmith' order by tablename, cmd$$,
  array[
    'household_allergies:DELETE', 'household_allergies:INSERT', 'household_allergies:SELECT', 'household_allergies:UPDATE',
    'household_dietary_requirements:DELETE', 'household_dietary_requirements:INSERT', 'household_dietary_requirements:SELECT', 'household_dietary_requirements:UPDATE',
    'household_members:DELETE', 'household_members:INSERT', 'household_members:SELECT', 'household_members:UPDATE',
    'household_settings:DELETE', 'household_settings:INSERT', 'household_settings:SELECT', 'household_settings:UPDATE',
    'households:SELECT', 'households:UPDATE',
    'profiles:INSERT', 'profiles:SELECT', 'profiles:UPDATE'
  ]::text[], 'Policy operation matrix matches the approved API contract'
);

select results_eq(
  $$select tablename::text from pg_catalog.pg_tables
    where schemaname = 'cooksmith'
      and tablename in ('infrastructure_health', 'app_user_roles')
      and exists (select 1 from pg_catalog.pg_policies p
        where p.schemaname = 'cooksmith' and p.tablename = pg_tables.tablename)
    order by tablename$$,
  array[]::text[], 'Default-deny tables expose no policy contract'
);

select results_eq(
  $$select routine_name::text || ':' || data_type::text
    from information_schema.routines
    where routine_schema = 'cooksmith'
      and routine_name in ('is_active_household_member', 'has_household_role', 'has_application_role')
    order by routine_name$$,
  array[
    'has_application_role:boolean',
    'has_household_role:boolean',
    'is_active_household_member:boolean'
  ]::text[], 'Authorisation helper return contract is stable'
);

select results_eq(
  $$select table_name::text from information_schema.tables
    where table_schema = 'cooksmith' and table_type = 'BASE TABLE' order by table_name$$,
  array[
    'app_user_roles', 'household_allergies', 'household_dietary_requirements',
    'household_members', 'household_settings', 'households', 'infrastructure_health', 'profiles'
  ]::text[], 'Private table surface matches the generated API contract'
);

select ok(
  has_table_privilege('authenticated', 'cooksmith.profiles', 'select,insert,update')
  and not has_table_privilege('authenticated', 'cooksmith.profiles', 'delete')
  and has_table_privilege('authenticated', 'cooksmith.households', 'select,update')
  and not has_table_privilege('authenticated', 'cooksmith.households', 'insert,delete'),
  'Profile and household operation grants match the contract'
);
select ok(
  has_table_privilege('authenticated', 'cooksmith.household_members', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.household_settings', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.household_dietary_requirements', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.household_allergies', 'select,insert,update,delete'),
  'Owner-managed table grants allow RLS to enforce the operation contract'
);
select ok(
  not has_schema_privilege('anon', 'cooksmith', 'usage')
  and not has_table_privilege('anon', 'cooksmith.profiles', 'select')
  and has_schema_privilege('authenticated', 'cooksmith', 'usage'),
  'Anonymous and authenticated API boundaries remain distinct'
);

select * from finish();
rollback;
