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
  $$select (tablename::text || ':' || cmd::text) collate "C" from pg_catalog.pg_policies
    where schemaname = 'cooksmith' order by tablename, cmd$$,
  (array[
    'household_allergies:DELETE', 'household_allergies:INSERT', 'household_allergies:SELECT', 'household_allergies:UPDATE',
    'household_dietary_requirements:DELETE', 'household_dietary_requirements:INSERT', 'household_dietary_requirements:SELECT', 'household_dietary_requirements:UPDATE',
    'household_invitations:SELECT',
    'household_members:DELETE', 'household_members:INSERT', 'household_members:SELECT', 'household_members:UPDATE',
    'household_pantry_items:DELETE', 'household_pantry_items:INSERT', 'household_pantry_items:SELECT', 'household_pantry_items:UPDATE',
    'household_recipes:INSERT', 'household_recipes:SELECT', 'household_recipes:UPDATE',
    'household_settings:DELETE', 'household_settings:INSERT', 'household_settings:SELECT', 'household_settings:UPDATE',
    'households:SELECT', 'households:UPDATE',
    'imported_recipes:INSERT', 'imported_recipes:SELECT', 'imported_recipes:UPDATE',
    'planned_meals:DELETE', 'planned_meals:INSERT', 'planned_meals:SELECT', 'planned_meals:UPDATE',
    'profiles:INSERT', 'profiles:SELECT', 'profiles:UPDATE',
    'recipe_ingredients:ALL', 'recipe_steps:ALL',
    'shopping_item_contributions:DELETE', 'shopping_item_contributions:INSERT', 'shopping_item_contributions:SELECT', 'shopping_item_contributions:UPDATE',
    'shopping_list_items:DELETE', 'shopping_list_items:INSERT', 'shopping_list_items:SELECT', 'shopping_list_items:UPDATE',
    'shopping_lists:SELECT'
  ]::text[]) collate "C", 'Policy operation matrix matches the approved API contract'
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
  $$select (routine_name::text || ':' || data_type::text) collate "C"
    from information_schema.routines
    where routine_schema = 'cooksmith'
      and routine_name in ('is_active_household_member', 'has_household_role', 'has_application_role')
    order by routine_name$$,
  (array[
    'has_application_role:boolean',
    'has_household_role:boolean',
    'is_active_household_member:boolean'
  ]::text[]) collate "C", 'Authorisation helper return contract is stable'
);

select results_eq(
  $$select table_name::text collate "C" from information_schema.tables
    where table_schema = 'cooksmith' and table_type = 'BASE TABLE' order by table_name$$,
  (array[
    'app_user_roles', 'household_allergies', 'household_dietary_requirements', 'household_invitations',
    'household_members', 'household_pantry_items', 'household_recipes', 'household_settings', 'households',
    'imported_recipes', 'infrastructure_health', 'planned_meals', 'profiles', 'recipe_ingredients', 'recipe_steps',
    'shopping_item_contributions', 'shopping_list_items', 'shopping_lists'
  ]::text[]) collate "C", 'Private table surface matches the generated API contract'
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
  and has_table_privilege('authenticated', 'cooksmith.household_allergies', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.household_pantry_items', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.household_recipes', 'select,insert,update')
  and not has_table_privilege('authenticated', 'cooksmith.household_recipes', 'delete')
  and has_table_privilege('authenticated', 'cooksmith.imported_recipes', 'select,insert,update')
  and not has_table_privilege('authenticated', 'cooksmith.imported_recipes', 'delete')
  and has_table_privilege('authenticated', 'cooksmith.planned_meals', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.recipe_ingredients', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.recipe_steps', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.shopping_lists', 'select')
  and not has_table_privilege('authenticated', 'cooksmith.shopping_lists', 'insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.shopping_list_items', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'cooksmith.shopping_item_contributions', 'select,insert,update,delete'),
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
