begin;
select plan(8);

select has_table(
  'cooksmith',
  'household_preference_profiles',
  'household preference profile table exists'
);
select col_is_pk(
  'cooksmith',
  'household_preference_profiles',
  'household_id',
  'one preference profile exists per household'
);
select col_not_null(
  'cooksmith',
  'household_preference_profiles',
  'people',
  'people cooked for is always represented'
);
select policies_are(
  'cooksmith',
  'household_preference_profiles',
  array[
    'household_preference_profiles_delete_active_member',
    'household_preference_profiles_insert_active_member',
    'household_preference_profiles_select_active_member',
    'household_preference_profiles_update_active_member'
  ],
  'active household membership protects every supported operation'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into cooksmith.household_preference_profiles (
      household_id, people, dietary_requirements, favourite_cuisines
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '[{"id":"40000000-0000-4000-8000-000000000001","displayName":"Synthetic child","allergies":["peanut"],"intolerances":[]}]',
      array['vegetarian'],
      array['thai']
    )$$,
  'an active household member can create a partial profile'
);

select is(
  (
    select dietary_requirements
    from cooksmith.household_preference_profiles
    where household_id = '20000000-0000-4000-8000-000000000001'
  ),
  array['vegetarian']::text[],
  'hard constraints round trip separately'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(
  $$select * from cooksmith.household_preference_profiles
    where household_id = '20000000-0000-4000-8000-000000000001'$$,
  'an unrelated user cannot read another household profile'
);
select results_eq(
  $$with changed as (
      update cooksmith.household_preference_profiles
      set preferred_store = 'Synthetic store'
      where household_id = '20000000-0000-4000-8000-000000000001'
      returning household_id
    ) select count(*)::integer from changed$$,
  array[0],
  'an unrelated user cannot update another household profile'
);

select * from finish();
rollback;
