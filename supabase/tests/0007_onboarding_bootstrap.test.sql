begin;

select plan(12);

select has_column('cooksmith', 'profiles', 'onboarding_step', 'Profile stores onboarding progress');
select has_column(
  'cooksmith',
  'profiles',
  'onboarding_completed_at',
  'Profile stores onboarding completion'
);
select has_function(
  'cooksmith',
  'bootstrap_household',
  array['text'],
  'Authenticated onboarding bootstrap RPC exists'
);
select ok(
  not has_function_privilege('anon', 'cooksmith.bootstrap_household(text)', 'execute')
  and has_function_privilege('authenticated', 'cooksmith.bootstrap_household(text)', 'execute'),
  'Only authenticated users can execute the bootstrap RPC'
);
select results_eq(
  $$select count(*)::integer
    from pg_catalog.pg_proc
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'cooksmith_private'
      and pg_proc.proname = 'bootstrap_household'
      and pg_proc.prosecdef
      and exists (
        select 1 from unnest(pg_proc.proconfig) as setting
        where setting like 'search_path=%'
          and replace(setting, 'search_path=', '') in ('', '""')
      )$$,
  array[1],
  'Privileged bootstrap implementation has an empty search path'
);

insert into auth.users (
  instance_id, id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-4000-8000-000000000006',
  'authenticated', 'authenticated',
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);
insert into cooksmith.profiles (id, display_name, onboarding_step)
values ('10000000-0000-4000-8000-000000000006', 'Onboarding User', 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select cooksmith.bootstrap_household('No caller')$$,
  '42501',
  'Authentication is required.',
  'Missing JWT identity cannot bootstrap a household'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select lives_ok(
  $$select cooksmith.bootstrap_household('  Test household  ')$$,
  'Authenticated profile can bootstrap a household'
);
select results_eq(
  $$select count(*)::integer from cooksmith.households where name = 'Test household'$$,
  array[1],
  'Bootstrap creates one trimmed household'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_members
    where user_id = '10000000-0000-4000-8000-000000000006'
      and role = 'owner' and status = 'active'$$,
  array[1],
  'Bootstrap creates the caller as active owner'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_settings$$,
  array[1],
  'Bootstrap creates default household settings visible to the owner'
);
select lives_ok(
  $$select cooksmith.bootstrap_household('Duplicate attempt')$$,
  'Repeated bootstrap safely returns the existing household'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_members
    where user_id = '10000000-0000-4000-8000-000000000006'$$,
  array[1],
  'Repeated bootstrap does not create another membership'
);

reset role;
select * from finish();
rollback;
