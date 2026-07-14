begin;

select plan(31);

select has_table('cooksmith', 'profiles', 'Profiles table exists');
select has_table('cooksmith', 'households', 'Households table exists');
select has_table('cooksmith', 'household_members', 'Household members table exists');
select has_table('cooksmith', 'app_user_roles', 'Application roles table exists');
select has_table('cooksmith', 'household_settings', 'Household settings table exists');
select has_table(
  'cooksmith',
  'household_dietary_requirements',
  'Dietary requirements table exists'
);
select has_table('cooksmith', 'household_allergies', 'Allergies table exists');

select has_function(
  'cooksmith',
  'set_updated_at',
  array[]::text[],
  'Shared updated-at trigger function exists'
);

select has_trigger('cooksmith', 'profiles', 'profiles_set_updated_at', 'Profiles timestamp trigger exists');
select has_trigger(
  'cooksmith',
  'households',
  'households_set_updated_at',
  'Households timestamp trigger exists'
);
select has_trigger(
  'cooksmith',
  'household_members',
  'household_members_set_updated_at',
  'Membership timestamp trigger exists'
);
select has_trigger(
  'cooksmith',
  'app_user_roles',
  'app_user_roles_set_updated_at',
  'Application role timestamp trigger exists'
);
select has_trigger(
  'cooksmith',
  'household_settings',
  'household_settings_set_updated_at',
  'Settings timestamp trigger exists'
);
select has_trigger(
  'cooksmith',
  'household_dietary_requirements',
  'household_dietary_requirements_set_updated_at',
  'Dietary timestamp trigger exists'
);
select has_trigger(
  'cooksmith',
  'household_allergies',
  'household_allergies_set_updated_at',
  'Allergy timestamp trigger exists'
);

select results_eq(
  $$select count(*)::integer from cooksmith.profiles$$,
  array[4],
  'Four deterministic synthetic profiles are seeded'
);
select results_eq(
  $$select count(*)::integer from cooksmith.households$$,
  array[2],
  'Two deterministic synthetic households are seeded'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_members$$,
  array[3],
  'Owner and member fixtures are seeded'
);
select results_eq(
  $$
    select count(*)::integer
    from cooksmith.household_members
    where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  array[0],
  'Unrelated user has no household membership'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_settings$$,
  array[2],
  'Each synthetic household has one settings row'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_dietary_requirements$$,
  array[1],
  'A synthetic dietary requirement is seeded'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_allergies$$,
  array[1],
  'A synthetic allergy is seeded'
);

select throws_ok(
  $$
    insert into cooksmith.household_allergies (
      household_id,
      applies_to_member_id,
      allergen
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      'Synthetic allergen'
    )
  $$,
  '23503',
  null,
  'Member-scoped allergies cannot cross household boundaries'
);

select throws_ok(
  $$
    insert into cooksmith.household_members (household_id, user_id, role)
    values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'member'
    )
  $$,
  '23505',
  null,
  'A user cannot have duplicate membership in one household'
);

select throws_ok(
  $$
    update cooksmith.household_settings
    set default_servings = 0
    where household_id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'Invalid serving counts are rejected'
);

update cooksmith.households
set updated_at = '2026-01-01 00:00:00+00',
    name = 'Household A updated'
where id = '20000000-0000-4000-8000-000000000001';

select ok(
  (
    select updated_at > '2026-01-01 00:00:00+00'
    from cooksmith.households
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  'Updated-at trigger refreshes mutable rows'
);

select results_eq(
  $$
    select enumlabel
    from pg_catalog.pg_enum
    join pg_catalog.pg_type on pg_type.oid = pg_enum.enumtypid
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'cooksmith'
      and pg_type.typname = 'household_role'
    order by enumsortorder
  $$,
  array['owner'::name, 'member'::name],
  'Household roles are restricted to owner and member'
);

select throws_ok(
  $$
    insert into cooksmith.app_user_roles (user_id, role, granted_by)
    values (
      '10000000-0000-4000-8000-000000000001',
      'admin',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  null,
  'Application roles cannot be self-granted at the schema layer'
);

select results_eq(
  $$
    select normalised_requirement
    from cooksmith.household_dietary_requirements
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  array['vegetarian'::text],
  'Dietary requirements have deterministic normalisation'
);

select results_eq(
  $$
    select normalised_allergen
    from cooksmith.household_allergies
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  array['peanut'::text],
  'Allergies have deterministic normalisation'
);

select has_index(
  'cooksmith',
  'household_members',
  'household_members_user_status_idx',
  'Membership lookup by user and status is indexed'
);

select * from finish();

rollback;
