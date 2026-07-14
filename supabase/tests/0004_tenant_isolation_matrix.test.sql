begin;

select no_plan();

-- Default-deny tables expose no browser operation.
select ok(
  not has_table_privilege('authenticated', 'cooksmith.infrastructure_health', 'select')
  and not has_table_privilege('authenticated', 'cooksmith.infrastructure_health', 'insert')
  and not has_table_privilege('authenticated', 'cooksmith.infrastructure_health', 'update')
  and not has_table_privilege('authenticated', 'cooksmith.infrastructure_health', 'delete'),
  'Infrastructure health is default deny for every operation'
);
select ok(
  not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'select')
  and not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'insert')
  and not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'update')
  and not has_table_privilege('authenticated', 'cooksmith.app_user_roles', 'delete'),
  'Application roles are default deny for every operation'
);

-- Owner A: reads and owner-managed writes remain inside Household A.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select results_eq($$select id from cooksmith.profiles$$,
  array['10000000-0000-4000-8000-000000000001'::uuid], 'Profiles SELECT is self only');
select results_eq($$update cooksmith.profiles set display_name = 'Owner A verified' returning id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid], 'Profiles UPDATE permits self');
select results_eq($$update cooksmith.profiles set display_name = 'Blocked' where id = '10000000-0000-4000-8000-000000000003' returning id$$,
  array[]::uuid[], 'Profiles UPDATE filters another identifier');
select throws_ok(
  $$insert into cooksmith.profiles (id, display_name) values ('10000000-0000-4000-8000-000000000004', 'Impersonated')$$,
  '42501', null, 'Profiles INSERT rejects another identifier');
select ok(not has_table_privilege('authenticated', 'cooksmith.profiles', 'delete'),
  'Profiles DELETE is not granted');

select results_eq($$select name from cooksmith.households$$,
  array['Household A'::text], 'Households SELECT is tenant isolated');
select results_eq($$update cooksmith.households set name = 'Household A verified' where id = '20000000-0000-4000-8000-000000000001' returning id$$,
  array['20000000-0000-4000-8000-000000000001'::uuid], 'Households UPDATE permits owner');
select results_eq($$update cooksmith.households set name = 'Blocked' where id = '20000000-0000-4000-8000-000000000002' returning id$$,
  array[]::uuid[], 'Households UPDATE filters cross-household identifier');
select ok(
  not has_table_privilege('authenticated', 'cooksmith.households', 'insert')
  and not has_table_privilege('authenticated', 'cooksmith.households', 'delete'),
  'Households INSERT and DELETE are not browser operations'
);

select results_eq($$select count(*)::integer from cooksmith.household_members$$,
  array[3], 'Membership SELECT includes only Household A rows');
select lives_ok(
  $$insert into cooksmith.household_members (id, household_id, user_id, created_by, updated_by)
    values ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001')$$,
  'Membership INSERT permits owner in their household'
);
select results_eq($$update cooksmith.household_members set role = 'member' where id = '30000000-0000-4000-8000-000000000010' returning id$$,
  array['30000000-0000-4000-8000-000000000010'::uuid], 'Membership UPDATE permits owner');
select results_eq($$delete from cooksmith.household_members where id = '30000000-0000-4000-8000-000000000010' returning id$$,
  array['30000000-0000-4000-8000-000000000010'::uuid], 'Membership DELETE permits owner');
select throws_ok(
  $$insert into cooksmith.household_members (household_id, user_id)
    values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004')$$,
  '42501', null, 'Membership INSERT rejects a cross-household identifier');
select throws_ok(
  $$update cooksmith.household_members set household_id = '20000000-0000-4000-8000-000000000002' where id = '30000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'Membership UPDATE rejects moving a row across households');

select results_eq($$select household_id from cooksmith.household_settings$$,
  array['20000000-0000-4000-8000-000000000001'::uuid], 'Settings SELECT is tenant isolated');
select results_eq($$update cooksmith.household_settings set default_servings = 6 where household_id = '20000000-0000-4000-8000-000000000001' returning household_id$$,
  array['20000000-0000-4000-8000-000000000001'::uuid], 'Settings UPDATE permits owner');
select results_eq($$update cooksmith.household_settings set default_servings = 6 where household_id = '20000000-0000-4000-8000-000000000002' returning household_id$$,
  array[]::uuid[], 'Settings UPDATE rejects a cross-household identifier');
select results_eq($$delete from cooksmith.household_settings where household_id = '20000000-0000-4000-8000-000000000001' returning household_id$$,
  array['20000000-0000-4000-8000-000000000001'::uuid], 'Settings DELETE permits owner');
select lives_ok(
  $$insert into cooksmith.household_settings (household_id, created_by, updated_by)
    values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001')$$,
  'Settings INSERT permits owner'
);

select results_eq($$select count(*)::integer from cooksmith.household_dietary_requirements$$,
  array[1], 'Dietary SELECT is tenant isolated');
select lives_ok(
  $$insert into cooksmith.household_dietary_requirements (id, household_id, requirement, created_by, updated_by)
    values ('40000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001',
      'Synthetic matrix diet', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'Dietary INSERT permits owner'
);
select results_eq($$update cooksmith.household_dietary_requirements set notes = 'verified' where id = '40000000-0000-4000-8000-000000000010' returning id$$,
  array['40000000-0000-4000-8000-000000000010'::uuid], 'Dietary UPDATE permits owner');
select results_eq($$delete from cooksmith.household_dietary_requirements where id = '40000000-0000-4000-8000-000000000010' returning id$$,
  array['40000000-0000-4000-8000-000000000010'::uuid], 'Dietary DELETE permits owner');
select throws_ok(
  $$insert into cooksmith.household_dietary_requirements (household_id, requirement)
    values ('20000000-0000-4000-8000-000000000002', 'Cross tenant diet')$$,
  '42501', null, 'Dietary INSERT rejects a cross-household identifier');

select results_eq($$select count(*)::integer from cooksmith.household_allergies$$,
  array[1], 'Allergy SELECT is tenant isolated');
select lives_ok(
  $$insert into cooksmith.household_allergies (id, household_id, allergen, created_by, updated_by)
    values ('50000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001',
      'Synthetic matrix allergen', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'Allergy INSERT permits owner'
);
select results_eq($$update cooksmith.household_allergies set notes = 'verified' where id = '50000000-0000-4000-8000-000000000010' returning id$$,
  array['50000000-0000-4000-8000-000000000010'::uuid], 'Allergy UPDATE permits owner');
select results_eq($$delete from cooksmith.household_allergies where id = '50000000-0000-4000-8000-000000000010' returning id$$,
  array['50000000-0000-4000-8000-000000000010'::uuid], 'Allergy DELETE permits owner');
select throws_ok(
  $$insert into cooksmith.household_allergies (household_id, applies_to_member_id, allergen)
    values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Manipulated member')$$,
  '23503', null, 'Allergy member identifier cannot cross household boundaries');

-- Member A: reads all Household A resources but cannot mutate owner-managed rows.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq($$select count(*)::integer from cooksmith.households$$, array[1], 'Member can SELECT household');
select results_eq($$select count(*)::integer from cooksmith.household_members$$, array[3], 'Member can SELECT memberships');
select results_eq($$select count(*)::integer from cooksmith.household_settings$$, array[1], 'Member can SELECT settings');
select results_eq($$select count(*)::integer from cooksmith.household_dietary_requirements$$, array[1], 'Member can SELECT dietary rows');
select results_eq($$select count(*)::integer from cooksmith.household_allergies$$, array[1], 'Member can SELECT allergy rows');
select results_eq($$update cooksmith.household_members set role = 'owner' where user_id = '10000000-0000-4000-8000-000000000002' returning id$$,
  array[]::uuid[], 'Member cannot self-promote');
select results_eq($$delete from cooksmith.household_allergies returning id$$,
  array[]::uuid[], 'Member cannot DELETE owner-managed rows');
select throws_ok(
  $$insert into cooksmith.household_dietary_requirements (household_id, requirement)
    values ('20000000-0000-4000-8000-000000000001', 'Self inserted')$$,
  '42501', null, 'Member cannot INSERT owner-managed rows');

-- Owner B and an unrelated actor cannot infer or mutate Household A by identifiers.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select results_eq($$select name from cooksmith.households$$, array['Household B'::text], 'Owner B SELECT remains isolated');
select results_eq($$delete from cooksmith.household_members where household_id = '20000000-0000-4000-8000-000000000001' returning id$$,
  array[]::uuid[], 'Owner B cannot DELETE Household A memberships');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq($$select count(*)::integer from cooksmith.households$$, array[0], 'Unrelated actor SELECT returns no households');
select results_eq($$update cooksmith.household_settings set default_servings = 9 returning household_id$$,
  array[]::uuid[], 'Unrelated actor UPDATE affects no settings');
select results_eq($$delete from cooksmith.household_dietary_requirements returning id$$,
  array[]::uuid[], 'Unrelated actor DELETE affects no dietary rows');

reset role;
select * from finish();
rollback;
